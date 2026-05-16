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

type BrokerInfo struct {
	ID               int      `json:"id"`
	Host             string   `json:"host"`
	Port             int      `json:"port"`
	BytesInPerSec    *float64 `json:"bytesInPerSec"`
	BytesOutPerSec   *float64 `json:"bytesOutPerSec"`
	PartitionsLeader int      `json:"partitionsLeader"`
	Partitions       int      `json:"partitions"`
	InSyncPartitions int      `json:"inSyncPartitions"`
	PartitionsSkew   *float64 `json:"partitionsSkew"`
	LeadersSkew      *float64 `json:"leadersSkew"`
}

type BrokersResponse struct {
	BrokerCount                   int          `json:"brokerCount"`
	ZooKeeperStatus               *string      `json:"zooKeeperStatus"`
	ActiveControllers             int          `json:"activeControllers"`
	OnlinePartitionCount          int          `json:"onlinePartitionCount"`
	OfflinePartitionCount         int          `json:"offlinePartitionCount"`
	InSyncReplicasCount           int          `json:"inSyncReplicasCount"`
	OutOfSyncReplicasCount        int          `json:"outOfSyncReplicasCount"`
	UnderReplicatedPartitionCount int          `json:"underReplicatedPartitionCount"`
	DiskUsage                     []DiskUsage  `json:"diskUsage"`
	Version                       string       `json:"version"`
	Brokers                       []BrokerInfo `json:"brokers"`
}

type DiskUsage struct {
	BrokerId     int   `json:"brokerId"`
	SegmentSize  int64 `json:"segmentSize"`
	SegmentCount int   `json:"segmentCount"`
}

type KafkaService interface {
	GetClusters() []ClusterResponse
	GetBrokersData(clusterName string) (*BrokersResponse, error)
}

type kafkaService struct {
	cfg *config.Config
}

func NewKafkaService(cfg *config.Config) KafkaService {
	return &kafkaService{cfg: cfg}
}

func (s *kafkaService) GetClusters() []ClusterResponse {
	clusterCount := len(s.cfg.KafkaClusters)
	responses := make([]ClusterResponse, clusterCount)
	resultChan := make(chan struct {
		index int
		res   ClusterResponse
	}, clusterCount)

	for i, clusterCfg := range s.cfg.KafkaClusters {
		go func(idx int, cfg config.KafkaClusterConfig) {
			res := s.getClusterMetadata(cfg)
			resultChan <- struct {
				index int
				res   ClusterResponse
			}{idx, res}
		}(i, clusterCfg)
	}

	for i := 0; i < clusterCount; i++ {
		result := <-resultChan
		responses[result.index] = result.res
	}

	return responses
}

func (s *kafkaService) GetBrokersData(clusterName string) (*BrokersResponse, error) {
	var clusterCfg *config.KafkaClusterConfig
	for _, c := range s.cfg.KafkaClusters {
		if c.Name == clusterName {
			clusterCfg = &c
			break
		}
	}

	if clusterCfg == nil {
		return nil, os.ErrNotExist
	}

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
			if err == nil {
				caCertPool := x509.NewCertPool()
				if ok := caCertPool.AppendCertsFromPEM(caCert); ok {
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

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client := &kafka.Client{
		Addr:      kafka.TCP(clusterCfg.BootstrapServers),
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	resp, err := client.Metadata(ctx, &kafka.MetadataRequest{})
	if err != nil {
		return nil, err
	}

	onlinePartitions := 0
	offlinePartitions := 0
	isrCount := 0
	osrCount := 0
	underReplicated := 0
	activeControllers := 0

	if resp.Controller.ID != -1 {
		activeControllers = 1
	}

	for _, topic := range resp.Topics {
		for _, p := range topic.Partitions {
			if p.Error == nil {
				onlinePartitions++
			} else {
				offlinePartitions++
			}

			isrCount += len(p.Isr)
			osrCount += len(p.Replicas) - len(p.Isr)

			if len(p.Isr) < len(p.Replicas) {
				underReplicated++
			}
		}
	}

	brokers := make([]BrokerInfo, 0)
	diskUsage := make([]DiskUsage, 0)
	for _, b := range resp.Brokers {
		brokerPartitions := 0
		brokerLeaders := 0
		inSyncPartitions := 0
		for _, topic := range resp.Topics {
			for _, p := range topic.Partitions {
				for _, replica := range p.Replicas {
					if replica.ID == b.ID {
						brokerPartitions++
						for _, isr := range p.Isr {
							if isr.ID == b.ID {
								inSyncPartitions++
								break
							}
						}
					}
				}
				if p.Leader.ID == b.ID {
					brokerLeaders++
				}
			}
		}

		brokers = append(brokers, BrokerInfo{
			ID:               b.ID,
			Host:             b.Host,
			Port:             b.Port,
			BytesInPerSec:    nil,
			BytesOutPerSec:   nil,
			PartitionsLeader: brokerLeaders,
			Partitions:       brokerPartitions,
			InSyncPartitions: inSyncPartitions,
			PartitionsSkew:   nil,
			LeadersSkew:      nil,
		})

		diskUsage = append(diskUsage, DiskUsage{
			BrokerId:     b.ID,
			SegmentSize:  0,
			SegmentCount: brokerPartitions,
		})
	}

	version := s.getKafkaVersion(ctx, clusterCfg, transport)

	return &BrokersResponse{
		BrokerCount:                   len(resp.Brokers),
		ZooKeeperStatus:               nil,
		ActiveControllers:             activeControllers,
		OnlinePartitionCount:          onlinePartitions,
		OfflinePartitionCount:         offlinePartitions,
		InSyncReplicasCount:           isrCount,
		OutOfSyncReplicasCount:        osrCount,
		UnderReplicatedPartitionCount: underReplicated,
		DiskUsage:                     diskUsage,
		Version:                       version,
		Brokers:                       brokers,
	}, nil
}

func (s *kafkaService) getKafkaVersion(ctx context.Context, clusterCfg *config.KafkaClusterConfig, transport *kafka.Transport) string {
	version := "Unknown"
	dialer := &kafka.Dialer{
		Timeout:       10 * time.Second,
		DualStack:     true,
		TLS:           transport.TLS,
		SASLMechanism: transport.SASL,
	}
	conn, err := dialer.DialContext(ctx, "tcp", clusterCfg.BootstrapServers)
	if err == nil {
		defer conn.Close()
		apiVersions, err := conn.ApiVersions()
		if err == nil {
			// In recent kafka-go/kafka, we can't easily get the human version
			// But we can check for specific API key max versions to guess.
			// This is a common pattern for Kafka version detection.
			maxApiKey := int16(0)
			for _, av := range apiVersions {
				if av.ApiKey > maxApiKey {
					maxApiKey = av.ApiKey
				}
			}

			// Rough estimation based on max API key
			if maxApiKey >= 48 {
				version = "3.x"
			} else if maxApiKey >= 42 {
				version = "2.x"
			} else if maxApiKey >= 16 {
				version = "1.x"
			} else {
				version = "0.x"
			}
		}
	}
	return version
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
	// log.Debug().Interface("metadata", resp).Msg("Kafka metadata response received")
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

	version := s.getKafkaVersion(ctx, &clusterCfg, transport)
	log.Debug().Str("cluster", clusterCfg.Name).Str("version", version).Msg("Kafka version retrieved")
	return ClusterResponse{
		Name:                 clusterCfg.Name,
		Status:               status,
		LastError:            lastError,
		BrokerCount:          brokerCount,
		OnlinePartitionCount: partitionCount,
		TopicCount:           topicCount,
		Version:              version,
		ReadOnly:             false,
		Features:             []string{"Brokers", "Topics", "Consumers"},
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
