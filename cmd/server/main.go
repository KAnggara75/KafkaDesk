package main

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/KAnggara75/KafkaDesk/internal/config"
	"github.com/KAnggara75/KafkaDesk/internal/handler"
	"github.com/KAnggara75/KafkaDesk/internal/router"
	"github.com/KAnggara75/KafkaDesk/internal/service"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		// Just warn, as env vars might be set in the system/docker
	}

	// Configure zerolog level from ENV
	logLevel := strings.ToLower(os.Getenv("LOG_LEVEL"))
	level := zerolog.DebugLevel
	switch logLevel {
	case "info":
		level = zerolog.InfoLevel
	case "warn":
		level = zerolog.WarnLevel
	case "error":
		level = zerolog.ErrorLevel
	}
	zerolog.SetGlobalLevel(level)

	zerolog.TimeFieldFormat = time.RFC3339
	log.Logger = log.Output(os.Stdout).With().
		Str("service", "KafkaDesk").
		Logger()

	cfg := config.LoadConfig()

	blacklistSvc := service.NewBlacklistService()
	authSvc := service.NewAuthService(cfg, blacklistSvc)
	authHandler := handler.NewAuthHandler(authSvc)

	kafkaSvc := service.NewKafkaService(cfg)
	kafkaHandler := handler.NewKafkaHandler(kafkaSvc)

	mux := router.NewRouter(cfg, authHandler, kafkaHandler, blacklistSvc)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Info().Stringer("level", level).Msg("KafkaDesk Server is running on :8080...")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal().Err(err).Msg("Server failed")
	}
}
