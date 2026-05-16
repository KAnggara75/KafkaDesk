package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type mockAuthService struct {
	loginFn  func(username, password string) (string, error)
	logoutFn func(token string) error
}

func (m *mockAuthService) Login(u, p string) (string, error) { return m.loginFn(u, p) }
func (m *mockAuthService) Logout(t string) error            { return m.logoutFn(t) }

func TestAuthHandler_Login(t *testing.T) {
	mockSvc := &mockAuthService{
		loginFn: func(u, p string) (string, error) {
			if u == "admin" && p == "pass" {
				return "valid-token", nil
			}
			return "", service.ErrInvalidCredentials
		},
	}
	h := NewAuthHandler(mockSvc)

	t.Run("Success", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"username": "admin", "password": "pass"})
		req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		h.Login(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp map[string]string
		json.NewDecoder(rr.Body).Decode(&resp)
		if resp["token"] != "valid-token" {
			t.Errorf("expected token 'valid-token', got %s", resp["token"])
		}
	})

	t.Run("Unauthorized", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"username": "wrong", "password": "pass"})
		req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		h.Login(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rr.Code)
		}
	})
}

func TestAuthHandler_Logout(t *testing.T) {
	mockSvc := &mockAuthService{
		logoutFn: func(t string) error {
			if t == "valid-token" {
				return nil
			}
			return service.ErrInvalidToken
		},
	}
	h := NewAuthHandler(mockSvc)

	t.Run("Success", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"token": "valid-token"})
		req := httptest.NewRequest("POST", "/api/v1/logout", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		h.Logout(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp map[string]string
		json.NewDecoder(rr.Body).Decode(&resp)
		if resp["message"] != "logout berhasil" {
			t.Errorf("expected message 'logout berhasil', got %s", resp["message"])
		}
	})

	t.Run("Failure", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"token": "invalid"})
		req := httptest.NewRequest("POST", "/api/v1/logout", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		h.Logout(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", rr.Code)
		}
	})
}
