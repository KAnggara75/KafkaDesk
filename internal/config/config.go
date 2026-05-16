package config

import (
	"fmt"
	"os"
	"strings"
)

type KafkaClusterConfig struct {
	Name             string
	BootstrapServers string
	Properties       map[string]string
}

type Config struct {
	LoginUsername string
	LoginPassword string
	JWTSecret     string
	KafkaClusters []KafkaClusterConfig
}

func LoadConfig() *Config {
	cfg := &Config{
		LoginUsername: getEnv("LOGIN_USERNAME", "admin"),
		LoginPassword: getEnv("LOGIN_PASSWORD", "admin"),
		JWTSecret:     getEnv("JWT_SECRET", "very-secret-key"),
	}

	// Parse Kafka Clusters
	for i := 0; ; i++ {
		nameKey := fmt.Sprintf("KAFKA_CLUSTERS_%d_NAME", i)
		name, ok := os.LookupEnv(nameKey)
		if !ok {
			break
		}

		cluster := KafkaClusterConfig{
			Name:             name,
			BootstrapServers: getEnv(fmt.Sprintf("KAFKA_CLUSTERS_%d_BOOTSTRAPSERVERS", i), ""),
			Properties:       make(map[string]string),
		}

		prefix := fmt.Sprintf("KAFKA_CLUSTERS_%d_PROPERTIES_", i)
		for _, env := range os.Environ() {
			pair := strings.SplitN(env, "=", 2)
			if len(pair) != 2 {
				continue
			}
			key := pair[0]
			value := pair[1]

			if strings.HasPrefix(key, prefix) {
				propKey := strings.TrimPrefix(key, prefix)
				cluster.Properties[propKey] = value
			}
		}

		cfg.KafkaClusters = append(cfg.KafkaClusters, cluster)
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
