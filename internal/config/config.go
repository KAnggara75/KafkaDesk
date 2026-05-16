package config

import (
	"os"
)

type Config struct {
	LoginUsername string
	LoginPassword string
	JWTSecret     string
}

func LoadConfig() *Config {
	return &Config{
		LoginUsername: getEnv("LOGIN_USERNAME", "admin"),
		LoginPassword: getEnv("LOGIN_PASSWORD", "admin"),
		JWTSecret:     getEnv("JWT_SECRET", "very-secret-key"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
