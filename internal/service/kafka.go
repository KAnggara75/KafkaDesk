package service

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/segmentio/kafka-go"

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

	// Connect to Kafka to get metadata
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	client := &kafka.Client{
		Addr:    kafka.TCP(clusterCfg.BootstrapServers),
		Timeout: 5 * time.Second,
	}

	resp, err := client.Metadata(ctx, &kafka.MetadataRequest{})
	if err != nil {
		status = "offline"
		errStr := err.Error()
		lastError = &errStr
		log.Error().Err(err).Str("cluster", clusterCfg.Name).Msg("Failed to fetch Kafka metadata")
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
