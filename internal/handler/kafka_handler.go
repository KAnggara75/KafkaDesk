package handler

import (
	"encoding/json"
	"net/http"

	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type KafkaHandler struct {
	kafkaService service.KafkaService
}

func NewKafkaHandler(kafkaService service.KafkaService) *KafkaHandler {
	return &KafkaHandler{kafkaService: kafkaService}
}

func (h *KafkaHandler) GetClusters(w http.ResponseWriter, r *http.Request) {
	clusters := h.kafkaService.GetClusters()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(clusters)
}
