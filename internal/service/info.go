package service

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	// These values can be set via ldflags during build
	Version   = "v0.7.2"
	CommitId  = "83b5a60"
	BuildTime = "2024-04-10T09:41:25.436Z"
)

type BuildInfo struct {
	CommitId        string `json:"commitId"`
	Version         string `json:"version"`
	BuildTime       string `json:"buildTime"`
	IsLatestRelease bool   `json:"isLatestRelease"`
}

type LatestRelease struct {
	VersionTag  string `json:"versionTag"`
	PublishedAt string `json:"publishedAt"`
	HtmlUrl     string `json:"htmlUrl"`
}

type InfoResponse struct {
	Build         BuildInfo      `json:"build"`
	LatestRelease *LatestRelease `json:"latestRelease"`
}

type InfoService interface {
	GetInfo(ctx context.Context) InfoResponse
}

type infoService struct {
	githubApiUrl string
}

func NewInfoService() InfoService {
	return &infoService{
		githubApiUrl: "https://api.github.com/repos/KAnggara75/KafkaDesk/releases/latest",
	}
}

type githubRelease struct {
	TagName     string    `json:"tag_name"`
	PublishedAt time.Time `json:"published_at"`
	HtmlUrl     string    `json:"html_url"`
}

func (s *infoService) GetInfo(ctx context.Context) InfoResponse {
	response := InfoResponse{
		Build: BuildInfo{
			CommitId:  CommitId,
			Version:   Version,
			BuildTime: BuildTime,
		},
	}

	// Fetch latest release from GitHub
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", s.githubApiUrl, nil)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to create GitHub API request")
		return response
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to fetch latest release from GitHub")
		return response
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var rel githubRelease
		if err := json.NewDecoder(resp.Body).Decode(&rel); err == nil {
			response.LatestRelease = &LatestRelease{
				VersionTag:  rel.TagName,
				PublishedAt: rel.PublishedAt.Format(time.RFC3339),
				HtmlUrl:     rel.HtmlUrl,
			}
			// Compare versions
			response.Build.IsLatestRelease = (Version == rel.TagName)
		} else {
			log.Warn().Err(err).Msg("Failed to decode GitHub release response")
		}
	} else {
		log.Warn().Int("status", resp.StatusCode).Msg("GitHub API returned non-OK status")
	}

	return response
}
