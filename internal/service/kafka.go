package service

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
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

type TopicListResponse struct {
	PageCount int         `json:"pageCount"`
	Topics    []TopicInfo `json:"topics"`
}

type TopicInfo struct {
	Name                      string          `json:"name"`
	Internal                  bool            `json:"internal"`
	PartitionCount            int             `json:"partitionCount"`
	ReplicationFactor         int             `json:"replicationFactor"`
	Replicas                  int             `json:"replicas"`
	InSyncReplicas            int             `json:"inSyncReplicas"`
	SegmentSize               int64           `json:"segmentSize"`
	SegmentCount              int             `json:"segmentCount"`
	BytesInPerSec             *float64        `json:"bytesInPerSec"`
	BytesOutPerSec            *float64        `json:"bytesOutPerSec"`
	UnderReplicatedPartitions int             `json:"underReplicatedPartitions"`
	CleanUpPolicy             string          `json:"cleanUpPolicy"`
	Partitions                []PartitionInfo `json:"partitions"`
}

type PartitionInfo struct {
	Partition int           `json:"partition"`
	Leader    int           `json:"leader"`
	Replicas  []ReplicaInfo `json:"replicas"`
	OffsetMax int64         `json:"offsetMax"`
	OffsetMin int64         `json:"offsetMin"`
}

type ReplicaInfo struct {
	Broker int  `json:"broker"`
	Leader bool `json:"leader"`
	InSync bool `json:"inSync"`
}

type DiskUsage struct {
	BrokerId     int   `json:"brokerId"`
	SegmentSize  int64 `json:"segmentSize"`
	SegmentCount int   `json:"segmentCount"`
}

type KafkaService interface {
	GetClusters() []ClusterResponse
	GetBrokersData(clusterName string) (*BrokersResponse, error)
	GetTopicsData(ctx context.Context, clusterName string) (*TopicListResponse, error)
}

type metadataCache struct {
	metadata  *kafka.MetadataResponse
	expiresAt time.Time
}

type kafkaService struct {
	cfg   *config.Config
	cache map[string]metadataCache
	mu    sync.RWMutex
}

func NewKafkaService(cfg *config.Config) KafkaService {
	return &kafkaService{
		cfg:   cfg,
		cache: make(map[string]metadataCache),
	}
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

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	resp, err := s.getMetadata(ctx, clusterCfg)
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

	version := s.getKafkaVersion(ctx, clusterCfg)

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

func (s *kafkaService) GetTopicsData(ctx context.Context, clusterName string) (*TopicListResponse, error) {
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

	resp, err := s.getMetadata(ctx, clusterCfg)
	if err != nil {
		return nil, err
	}

	transport := s.getTransport(clusterCfg)

	topics := make([]TopicInfo, 0, len(resp.Topics))
	for _, topic := range resp.Topics {
		pInfos := make([]PartitionInfo, len(topic.Partitions))
		totalReplicas := 0
		totalIsr := 0
		underReplicated := 0

		for i, p := range topic.Partitions {
			replicas := make([]ReplicaInfo, 0, len(p.Replicas))
			for _, r := range p.Replicas {
				isInSync := false
				for _, isr := range p.Isr {
					if isr.ID == r.ID {
						isInSync = true
						break
					}
				}
				replicas = append(replicas, ReplicaInfo{
					Broker: r.ID,
					Leader: p.Leader.ID == r.ID,
					InSync: isInSync,
				})
			}

			totalReplicas += len(p.Replicas)
			totalIsr += len(p.Isr)
			if len(p.Isr) < len(p.Replicas) {
				underReplicated++
			}

			pInfos[i] = PartitionInfo{
				Partition: p.ID,
				Leader:    p.Leader.ID,
				Replicas:  replicas,
			}
		}

		// Group partitions by leader to fetch offsets in batch
		leaderPartitions := make(map[int][]int) // leaderID -> list of partition indices in topic.Partitions
		for i, p := range topic.Partitions {
			leaderPartitions[p.Leader.ID] = append(leaderPartitions[p.Leader.ID], i)
		}

		log.Debug().
			Str("topic", topic.Name).
			Int("leaderCount", len(leaderPartitions)).
			Int("partitionCount", len(topic.Partitions)).
			Msg("Starting batch offset fetch for topic")

		var pWg sync.WaitGroup
		for leaderID, pIndices := range leaderPartitions {
			// Find leader address
			var leaderAddr string
			for _, b := range resp.Brokers {
				if b.ID == leaderID {
					leaderAddr = net.JoinHostPort(b.Host, fmt.Sprintf("%d", b.Port))
					break
				}
			}

			if leaderAddr == "" {
				continue
			}

			pWg.Add(1)
			go func(addr string, indices []int) {
				defer pWg.Done()
				defer func() {
					if r := recover(); r != nil {
						log.Error().Interface("panic", r).Str("leader", addr).Msg("Recovered from panic in offset fetch goroutine")
					}
				}()

				client := &kafka.Client{
					Addr:      kafka.TCP(addr),
					Transport: transport,
				}

				// Fetch Latest Offsets (-1)
				latestReq := make(map[string][]kafka.OffsetRequest)
				latestReq[topic.Name] = make([]kafka.OffsetRequest, len(indices))
				for i, idx := range indices {
					latestReq[topic.Name][i] = kafka.OffsetRequest{
						Partition: topic.Partitions[idx].ID,
						Timestamp: kafka.LastOffset,
					}
				}

				latestRes, err := client.ListOffsets(ctx, &kafka.ListOffsetsRequest{
					Topics: latestReq,
				})
				if err == nil && latestRes != nil && latestRes.Topics != nil {
					if partitions, ok := latestRes.Topics[topic.Name]; ok {
						for _, resP := range partitions {
							// Find which local index this belongs to
							for _, idx := range indices {
								if topic.Partitions[idx].ID == resP.Partition {
									pInfos[idx].OffsetMax = resP.FirstOffset
									break
								}
							}
						}
					}
				} else {
					log.Warn().Err(err).Str("topic", topic.Name).Str("leader", addr).Msg("Failed to fetch latest offsets in batch")
				}

				// Fetch Earliest Offsets (-2)
				earliestReq := make(map[string][]kafka.OffsetRequest)
				earliestReq[topic.Name] = make([]kafka.OffsetRequest, len(indices))
				for i, idx := range indices {
					earliestReq[topic.Name][i] = kafka.OffsetRequest{
						Partition: topic.Partitions[idx].ID,
						Timestamp: kafka.FirstOffset,
					}
				}

				earliestRes, err := client.ListOffsets(ctx, &kafka.ListOffsetsRequest{
					Topics: earliestReq,
				})
				if err == nil && earliestRes != nil && earliestRes.Topics != nil {
					if partitions, ok := earliestRes.Topics[topic.Name]; ok {
						for _, resP := range partitions {
							for _, idx := range indices {
								if topic.Partitions[idx].ID == resP.Partition {
									pInfos[idx].OffsetMin = resP.FirstOffset
									break
								}
							}
						}
					}
				} else {
					log.Warn().Err(err).Str("topic", topic.Name).Str("leader", addr).Msg("Failed to fetch earliest offsets in batch")
				}
			}(leaderAddr, pIndices)
		}
		pWg.Wait()

		totalOffsetMax := int64(0)
		for _, pi := range pInfos {
			totalOffsetMax += pi.OffsetMax
		}

		replicationFactor := 0
		if len(topic.Partitions) > 0 {
			replicationFactor = len(topic.Partitions[0].Replicas)
		}

		isInternal := topic.Internal || topic.Name == "_schemas"
		topics = append(topics, TopicInfo{
			Name:                      topic.Name,
			Internal:                  isInternal,
			PartitionCount:            len(topic.Partitions),
			ReplicationFactor:         replicationFactor,
			Replicas:                  totalReplicas,
			InSyncReplicas:            totalIsr,
			SegmentSize:               0,                   // Placeholder
			SegmentCount:              int(totalOffsetMax), // Total offset max
			BytesInPerSec:             nil,                 // Placeholder
			BytesOutPerSec:            nil,                 // Placeholder
			UnderReplicatedPartitions: underReplicated,
			CleanUpPolicy:             "COMPACT_DELETE", // Placeholder
			Partitions:                pInfos,
		})
	}

	return &TopicListResponse{
		PageCount: 1,
		Topics:    topics,
	}, nil
}

func (s *kafkaService) getMetadata(ctx context.Context, clusterCfg *config.KafkaClusterConfig) (*kafka.MetadataResponse, error) {
	s.mu.RLock()
	cached, ok := s.cache[clusterCfg.Name]
	s.mu.RUnlock()

	if ok && time.Now().Before(cached.expiresAt) {
		return cached.metadata, nil
	}

	transport := s.getTransport(clusterCfg)
	client := &kafka.Client{
		Addr:      kafka.TCP(clusterCfg.BootstrapServers),
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	resp, err := client.Metadata(ctx, &kafka.MetadataRequest{})
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.cache[clusterCfg.Name] = metadataCache{
		metadata:  resp,
		expiresAt: time.Now().Add(30 * time.Second),
	}
	s.mu.Unlock()

	return resp, nil
}

func (s *kafkaService) getTransport(clusterCfg *config.KafkaClusterConfig) *kafka.Transport {
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
	return transport
}

func (s *kafkaService) getKafkaVersion(ctx context.Context, clusterCfg *config.KafkaClusterConfig) string {
	version := "Unknown"
	transport := s.getTransport(clusterCfg)
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

	// Connect to Kafka to get metadata
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	resp, err := s.getMetadata(ctx, &clusterCfg)
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

	version := s.getKafkaVersion(ctx, &clusterCfg)
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
