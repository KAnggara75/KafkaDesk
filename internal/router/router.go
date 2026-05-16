package router

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/KAnggara75/KafkaDesk/internal/config"
	"github.com/KAnggara75/KafkaDesk/internal/handler"
	"github.com/KAnggara75/KafkaDesk/internal/service"
)

func NewRouter(cfg *config.Config, authHandler *handler.AuthHandler, kafkaHandler *handler.KafkaHandler, blacklist service.BlacklistService) *http.ServeMux {
	mux := http.NewServeMux()

	// Auth Middleware
	auth := handler.AuthMiddleware(cfg, blacklist)

	// 1. API Endpoints
	mux.HandleFunc("POST /api/v1/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/logout", authHandler.Logout)

	// Protected API Endpoints
	mux.Handle("GET /api/v1/clusters", auth(http.HandlerFunc(kafkaHandler.GetClusters)))

	// 2. Static File Server & SPA Fallback
	distPath := "web/dist"
	fileServer := http.FileServer(http.Dir(distPath))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		cleanPath := filepath.Clean(r.URL.Path)
		fullPath := filepath.Join(distPath, cleanPath)

		rel, err := filepath.Rel(distPath, fullPath)
		if err != nil || (len(rel) >= 2 && rel[:2] == "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		info, err := os.Stat(fullPath)
		if os.IsNotExist(err) || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
			return
		}

		fileServer.ServeHTTP(w, r)
	})

	return mux
}
