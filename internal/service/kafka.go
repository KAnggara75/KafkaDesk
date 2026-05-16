package service

import (
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
		responses = append(responses, ClusterResponse{
			Name:                 clusterCfg.Name,
			DefaultCluster:       nil,
			Status:               "online",
			LastError:            nil,
			BrokerCount:          2,
			OnlinePartitionCount: 10, // Mock data
			TopicCount:           5,  // Mock data
			BytesInPerSec:        nil,
			BytesOutPerSec:       nil,
			ReadOnly:             false,
			Version:              "1.0-UNKNOWN",
			Features:             []string{"TOPIC_DELETION", "KAFKA_ACL_VIEW"},
		})
	}

	return responses
}
