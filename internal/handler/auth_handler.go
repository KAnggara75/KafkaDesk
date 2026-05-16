package handler

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	token, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			log.Warn().
				Str("endpoint", "/api/v1/login").
				Str("method", r.Method).
				Str("user", req.Username).
				Msg("Login failed: invalid credentials")

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		log.Error().
			Err(err).
			Str("endpoint", "/api/v1/login").
			Str("method", r.Method).
			Msg("Internal server error during login")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info().
		Str("endpoint", "/api/v1/login").
		Str("method", r.Method).
		Str("user", req.Username).
		Msg("User logged in successfully")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || len(authHeader) < 7 || authHeader[:7] != "Bearer " {
		http.Error(w, "invalid authorization header", http.StatusBadRequest)
		return
	}
	token := authHeader[7:]

	jti, err := h.authService.Logout(token)
	if err != nil {
		log.Warn().
			Err(err).
			Str("endpoint", "/api/v1/logout").
			Str("method", r.Method).
			Msg("Logout attempt failed")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "logout gagal"})
		return
	}

	log.Info().
		Str("endpoint", "/api/v1/logout").
		Str("method", r.Method).
		Str("jti", jti).
		Msg("User logged out successfully")
	w.WriteHeader(http.StatusNoContent)
}
