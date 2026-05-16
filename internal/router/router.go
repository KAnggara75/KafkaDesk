package router

import (
	"net/http"

	"github.com/KAnggara75/KafkaDesk/internal/handler"
)

func NewRouter(authHandler *handler.AuthHandler) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/logout", authHandler.Logout)

	return mux
}
