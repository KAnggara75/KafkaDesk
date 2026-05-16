package handler

import (
	"encoding/json"
	"log"
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
	user := r.Context().Value(UserContextKey)
	clusters := h.kafkaService.GetClusters()

	log.Printf("[KAFKA] User [%q] requested cluster list. Returning %d clusters.", user, len(clusters)) // #nosec G706

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(clusters)
}
