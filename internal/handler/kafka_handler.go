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

func (h *KafkaHandler) GetBrokers(w http.ResponseWriter, r *http.Request) {
	clusterName := r.PathValue("clusterName")
	if clusterName == "" {
		http.Error(w, "Cluster name is required", http.StatusBadRequest)
		return
	}

	brokersData, err := h.kafkaService.GetBrokersData(clusterName)
	if err != nil {
		log.Error().Err(err).Str("cluster", clusterName).Msg("Failed to get brokers data")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(brokersData)
}

func (h *KafkaHandler) GetTopics(w http.ResponseWriter, r *http.Request) {
	clusterName := r.PathValue("clusterName")
	if clusterName == "" {
		http.Error(w, "Cluster name is required", http.StatusBadRequest)
		return
	}

	topicsData, err := h.kafkaService.GetTopicsData(r.Context(), clusterName)
	if err != nil {
		log.Error().Err(err).Str("cluster", clusterName).Msg("Failed to get topics data")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(topicsData)
}
