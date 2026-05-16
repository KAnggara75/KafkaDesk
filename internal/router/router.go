package router

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/KAnggara75/KafkaDesk/internal/handler"
)

func NewRouter(authHandler *handler.AuthHandler) *http.ServeMux {
	mux := http.NewServeMux()

	// 1. API Endpoints
	mux.HandleFunc("POST /api/v1/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/logout", authHandler.Logout)

	// 2. Static File Server & SPA Fallback
	distPath := "web/dist"
	fileServer := http.FileServer(http.Dir(distPath))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Bersihkan path untuk mencegah path traversal
		cleanPath := filepath.Clean(r.URL.Path)
		fullPath := filepath.Join(distPath, cleanPath)

		// Verifikasi bahwa path yang dibersihkan tetap berada di dalam distPath
		rel, err := filepath.Rel(distPath, fullPath)
		if err != nil || (len(rel) >= 2 && rel[:2] == "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Cek status file
		info, err := os.Stat(fullPath)

		// Jika file tidak ada atau merupakan direktori, sajikan index.html (SPA Fallback)
		if os.IsNotExist(err) || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
			return
		}

		// Jika file ada, sajikan menggunakan FileServer
		fileServer.ServeHTTP(w, r)
	})

	return mux
}
