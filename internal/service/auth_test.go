package service

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/KAnggara75/KafkaDesk/internal/config"
)

type mockBlacklist struct {
	blacklisted map[string]bool
}

func (m *mockBlacklist) Add(jti string, expiresAt time.Time) {
	m.blacklisted[jti] = true
}

func (m *mockBlacklist) IsBlacklisted(jti string) bool {
	return m.blacklisted[jti]
}

func TestAuthService_Login(t *testing.T) {
	cfg := &config.Config{
		LoginUsername: "admin",
		LoginPassword: "password",
		JWTSecret:     "secret",
	}
	blacklist := &mockBlacklist{blacklisted: make(map[string]bool)}
	svc := NewAuthService(cfg, blacklist)

	// Test successful login
	token, err := svc.Login("admin", "password")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if token == "" {
		t.Fatal("expected token, got empty string")
	}

	// Test invalid credentials
	_, err = svc.Login("wrong", "password")
	if err != ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}

	// Test token validity
	parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse token: %v", err)
	}
	if !parsedToken.Valid {
		t.Fatal("expected valid token")
	}

	claims := parsedToken.Claims.(jwt.MapClaims)
	if claims["sub"] != "admin" {
		t.Errorf("expected sub claim 'admin', got %v", claims["sub"])
	}
	if claims["jti"] == nil {
		t.Error("expected jti claim, got nil")
	}
}

func TestAuthService_Logout(t *testing.T) {
	cfg := &config.Config{
		LoginUsername: "admin",
		LoginPassword: "password",
		JWTSecret:     "secret",
	}
	blacklist := &mockBlacklist{blacklisted: make(map[string]bool)}
	svc := NewAuthService(cfg, blacklist)

	token, _ := svc.Login("admin", "password")

	_, err := svc.Logout(token)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify jti is blacklisted
	parsedToken, _ := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})
	claims := parsedToken.Claims.(jwt.MapClaims)
	jti := claims["jti"].(string)

	if !blacklist.IsBlacklisted(jti) {
		t.Error("expected jti to be blacklisted")
	}
}
