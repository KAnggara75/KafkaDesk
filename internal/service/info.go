package service

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	// These values can be set via ldflags during build
	Version   = "dev"
	CommitID  = "83b5a60"
	BuildTime = "May 16, 2026"
)

type BuildInfo struct {
	CommitID        string `json:"commitId"`
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
	tagsApiUrl   string
}

func NewInfoService() InfoService {
	return &infoService{
		githubApiUrl: "https://api.github.com/repos/KAnggara75/KafkaDesk/releases/latest",
		tagsApiUrl:   "https://api.github.com/repos/KAnggara75/KafkaDesk/tags",
	}
}

type githubRelease struct {
	TagName     string    `json:"tag_name"`
	PublishedAt time.Time `json:"published_at"`
	HtmlUrl     string    `json:"html_url"`
}

type githubTag struct {
	Name   string `json:"name"`
	Commit struct {
		Sha string `json:"sha"`
	} `json:"commit"`
}

func (s *infoService) GetInfo(ctx context.Context) InfoResponse {
	response := InfoResponse{
		Build: BuildInfo{
			CommitID:  CommitID,
			Version:   Version,
			BuildTime: BuildTime,
		},
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	// 1. Fetch tags to determine build version
	if CommitID != "unknown" {
		req, _ := http.NewRequestWithContext(ctx, "GET", s.tagsApiUrl, nil)
		if resp, err := client.Do(req); err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var tags []githubTag
				if err := json.NewDecoder(resp.Body).Decode(&tags); err == nil {
					for _, tag := range tags {
						if strings.HasPrefix(tag.Commit.Sha, CommitID) {
							response.Build.Version = tag.Name
							break
						}
					}
				}
			}
		}
	}

	// 2. Fetch latest release from GitHub
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
			response.Build.IsLatestRelease = (response.Build.Version == rel.TagName)
		} else {
			log.Warn().Err(err).Msg("Failed to decode GitHub release response")
		}
	} else {
		log.Warn().Int("status", resp.StatusCode).Msg("GitHub API returned non-OK status")
	}

	return response
}
