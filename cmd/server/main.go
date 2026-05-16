package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/KAnggara75/KafkaDesk/internal/config"
	"github.com/KAnggara75/KafkaDesk/internal/handler"
	"github.com/KAnggara75/KafkaDesk/internal/router"
	"github.com/KAnggara75/KafkaDesk/internal/service"
)

func main() {
	cfg := config.LoadConfig()

	blacklistSvc := service.NewBlacklistService()
	authSvc := service.NewAuthService(cfg, blacklistSvc)
	authHandler := handler.NewAuthHandler(authSvc)

	kafkaSvc := service.NewKafkaService(cfg)
	kafkaHandler := handler.NewKafkaHandler(kafkaSvc)

	mux := router.NewRouter(cfg, authHandler, kafkaHandler)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	fmt.Println("KafkaDesk Server is running on :8080...")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
