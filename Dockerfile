# -------- FRONTEND BUILD STAGE --------
FROM node:22-alpine AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# -------- BACKEND BUILD STAGE --------
FROM golang:1.26.3-bookworm AS builder

WORKDIR /build

# Install dependency (including ca-certificates for GitHub API calls)
RUN apt-get update && apt-get install -y \
    git \
    ca-certificates \
    build-essential \
    librdkafka-dev \
 && rm -rf /var/lib/apt/lists/*

# Cache dependency
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Copy built frontend from stage 1
COPY --from=frontend-builder /web/dist ./web/dist

# Build-time arguments for versioning
ARG VERSION=v0.7.2
ARG COMMIT_ID=unknown
ARG BUILD_TIME=unknown

# Build binary
# Note: Using CGO_ENABLED=1 and amd64 as requested in user template
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s \
    -X 'github.com/KAnggara75/KafkaDesk/internal/service.Version=${VERSION}' \
    -X 'github.com/KAnggara75/KafkaDesk/internal/service.CommitId=${COMMIT_ID}' \
    -X 'github.com/KAnggara75/KafkaDesk/internal/service.BuildTime=${BUILD_TIME}'" \
    -trimpath -o kafkadesk ./cmd/server/main.go


# -------- RUNTIME STAGE --------
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    tzdata \
    librdkafka1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary and frontend dist
COPY --from=builder /build/kafkadesk .
COPY --from=builder /build/web/dist ./web/dist

# Security hardening
RUN useradd -u 10001 appuser
USER appuser

# Environment variables
ENV PORT=8080
ENV TZ=Asia/Jakarta

EXPOSE 8080

CMD ["./kafkadesk"]
