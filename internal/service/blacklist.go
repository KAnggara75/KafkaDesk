package service

import (
	"sync"
	"time"
)

type BlacklistService interface {
	Add(jti string, expiresAt time.Time)
	IsBlacklisted(jti string) bool
}

type inMemoryBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time
}

func NewBlacklistService() BlacklistService {
	s := &inMemoryBlacklist{
		tokens: make(map[string]time.Time),
	}
	go s.cleanupWorker()
	return s
}

func (s *inMemoryBlacklist) Add(jti string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[jti] = expiresAt
}

func (s *inMemoryBlacklist) IsBlacklisted(jti string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.tokens[jti]
	return exists
}

func (s *inMemoryBlacklist) cleanupWorker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for jti, exp := range s.tokens {
			if now.After(exp) {
				delete(s.tokens, jti)
			}
		}
		s.mu.Unlock()
	}
}
