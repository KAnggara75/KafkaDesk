package handler

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type KafkaHandler struct {
	kafkaService service.KafkaService
}

func NewKafkaHandler(kafkaService service.KafkaService) *KafkaHandler {
	return &KafkaHandler{kafkaService: kafkaService}
}

func (h *KafkaHandler) GetClusters(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(UserContextKey)
	clusters := h.kafkaService.GetClusters()

	log.Info().
		Str("endpoint", "/api/v1/clusters").
		Str("method", r.Method).
		Interface("user", user).
		Int("clusterCount", len(clusters)).
		Msg("User requested cluster list")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(clusters)
}
