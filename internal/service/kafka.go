package service

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/plain"

	"github.com/KAnggara75/KafkaDesk/internal/config"
)

type ClusterResponse struct {
	Name                 string   `json:"name"`
	DefaultCluster       *bool    `json:"defaultCluster"`
	Status               string   `json:"status"`
	LastError            *string  `json:"lastError"`
	BrokerCount          int      `json:"brokerCount"`
	OnlinePartitionCount int      `json:"onlinePartitionCount"`
	TopicCount           int      `json:"topicCount"`
	BytesInPerSec        *float64 `json:"bytesInPerSec"`
	BytesOutPerSec       *float64 `json:"bytesOutPerSec"`
	ReadOnly             bool     `json:"readOnly"`
	Version              string   `json:"version"`
	Features             []string `json:"features"`
}

type KafkaService interface {
	GetClusters() []ClusterResponse
}

type kafkaService struct {
	cfg *config.Config
}

func NewKafkaService(cfg *config.Config) KafkaService {
	return &kafkaService{cfg: cfg}
}

func (s *kafkaService) GetClusters() []ClusterResponse {
	responses := make([]ClusterResponse, 0)

	for _, clusterCfg := range s.cfg.KafkaClusters {
		res := s.getClusterMetadata(clusterCfg)
		responses = append(responses, res)
	}

	return responses
}

func (s *kafkaService) getClusterMetadata(clusterCfg config.KafkaClusterConfig) ClusterResponse {
	status := "online"
	var lastError *string = nil
	brokerCount := 0
	topicCount := 0
	partitionCount := 0

	// Configure Transport (TLS + SASL)
	transport := &kafka.Transport{
		IdleTimeout: 30 * time.Second,
	}

	securityProtocol := clusterCfg.Properties["SECURITY_PROTOCOL"]
	if securityProtocol == "SSL" || securityProtocol == "SASL_SSL" {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
		}

		if caLocation, ok := clusterCfg.Properties["SSL_CA_LOCATION"]; ok {
			caCert, err := s.loadCACert(caLocation)
			if err != nil {
				log.Warn().Err(err).Str("cluster", clusterCfg.Name).Str("location", caLocation).Msg("Failed to load CA certificate")
			} else {
				caCertPool := x509.NewCertPool()
				if ok := caCertPool.AppendCertsFromPEM(caCert); !ok {
					log.Warn().Str("cluster", clusterCfg.Name).Msg("Failed to append CA certificate to pool")
				} else {
					tlsConfig.RootCAs = caCertPool
				}
			}
		}
		transport.TLS = tlsConfig
	}

	saslMechanism := clusterCfg.Properties["SASL_MECHANISM"]
	if saslMechanism == "PLAIN" {
		jaasConfig := clusterCfg.Properties["SASL_JAAS_CONFIG"]
		username, password := parseJAAS(jaasConfig)
		if username != "" && password != "" {
			transport.SASL = plain.Mechanism{
				Username: username,
				Password: password,
			}
		}
	}

	// Connect to Kafka to get metadata
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client := &kafka.Client{
		Addr:      kafka.TCP(clusterCfg.BootstrapServers),
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	resp, err := client.Metadata(ctx, &kafka.MetadataRequest{})
	log.Debug().Interface("metadata", resp).Msg("Kafka metadata response received")
	if err != nil {
		status = "offline"
		errStr := err.Error()
		lastError = &errStr
		log.Warn().Err(err).Str("cluster", clusterCfg.Name).Msg("Failed to fetch Kafka metadata")
	} else {
		brokerCount = len(resp.Brokers)
		topicCount = len(resp.Topics)
		for _, topic := range resp.Topics {
			partitionCount += len(topic.Partitions)
		}
	}

	return ClusterResponse{
		Name:                 clusterCfg.Name,
		DefaultCluster:       nil,
		Status:               status,
		LastError:            lastError,
		BrokerCount:          brokerCount,
		OnlinePartitionCount: partitionCount,
		TopicCount:           topicCount,
		BytesInPerSec:        nil,
		BytesOutPerSec:       nil,
		ReadOnly:             false,
		Version:              "N/A",
		Features:             []string{"TOPIC_DELETION", "KAFKA_ACL_VIEW"},
	}
}

func (s *kafkaService) loadCACert(location string) ([]byte, error) {
	if strings.HasPrefix(location, "http://") || strings.HasPrefix(location, "https://") {
		// Download from URL
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(location)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, os.ErrNotExist // Or custom error
		}

		return io.ReadAll(resp.Body)
	}

	// Load from local file
	return os.ReadFile(location) // #nosec G304
}

func parseJAAS(config string) (string, string) {
	reUser := regexp.MustCompile(`username="([^"]+)"`)
	rePass := regexp.MustCompile(`password="([^"]+)"`)

	userMatch := reUser.FindStringSubmatch(config)
	passMatch := rePass.FindStringSubmatch(config)

	var user, pass string
	if len(userMatch) > 1 {
		user = userMatch[1]
	}
	if len(passMatch) > 1 {
		pass = passMatch[1]
	}

	return user, pass
}
