package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/KAnggara75/KafkaDesk/internal/config"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrInvalidToken       = errors.New("invalid token")
)

type AuthService interface {
	Login(username, password string) (string, error)
	Logout(tokenString string) error
}

type authService struct {
	cfg       *config.Config
	blacklist BlacklistService
}

func NewAuthService(cfg *config.Config, blacklist BlacklistService) AuthService {
	return &authService{
		cfg:       cfg,
		blacklist: blacklist,
	}
}

func (s *authService) Login(username, password string) (string, error) {
	if username != s.cfg.LoginUsername || password != s.cfg.LoginPassword {
		return "", ErrInvalidCredentials
	}

	jti := uuid.New().String()
	now := time.Now()
	expiresAt := now.Add(30 * time.Minute)

	claims := jwt.MapClaims{
		"sub": username,
		"jti": jti,
		"iat": now.Unix(),
		"exp": expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *authService) Logout(tokenString string) error {
	token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		jti, okJti := claims["jti"].(string)
		exp, okExp := claims["exp"].(float64)

		if okJti && okExp {
			s.blacklist.Add(jti, time.Unix(int64(exp), 0))
			return nil
		}
	}

	return ErrInvalidToken
}
