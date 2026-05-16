package main

import (
	"fmt"
	"log"
	"net/http"

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

	mux := router.NewRouter(authHandler)

	fmt.Println("KafkaDesk Server is running on :8080...")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
