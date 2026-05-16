package handler

import (
	"encoding/json"
	"net/http"

	"github.com/KAnggara75/KafkaDesk/internal/service"
)

type InfoHandler struct {
	infoService service.InfoService
}

func NewInfoHandler(infoService service.InfoService) *InfoHandler {
	return &InfoHandler{
		infoService: infoService,
	}
}

func (h *InfoHandler) GetInfo(w http.ResponseWriter, r *http.Request) {
	info := h.infoService.GetInfo(r.Context())

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(info); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
