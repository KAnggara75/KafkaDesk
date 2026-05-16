package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/KAnggara75/KafkaDesk/internal/config"
	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type contextKey string

const UserContextKey contextKey = "user"

func AuthMiddleware(cfg *config.Config, blacklist service.BlacklistService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			renderError := func(message string, status int) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				renderError("Unauthorized", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				renderError("Invalid authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				renderError("Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				renderError("Unauthorized", http.StatusUnauthorized)
				return
			}

			// Check Blacklist
			if jti, ok := claims["jti"].(string); ok {
				if blacklist.IsBlacklisted(jti) {
					renderError("Unauthorized: token is blacklisted", http.StatusUnauthorized)
					return
				}
			}

			ctx := context.WithValue(r.Context(), UserContextKey, claims["sub"])
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
