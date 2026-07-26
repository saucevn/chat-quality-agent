# =============================================================================
# Chat Quality Agent - Môi trường DEV LOCAL
# =============================================================================
# Mô hình hybrid: MySQL trong Docker, backend + frontend chạy native trên host.
#
#   make setup   -> cài dependency + bật DB (chạy 1 lần)
#   make dev     -> chạy backend + frontend, mở http://localhost:3000
#   make seed    -> tạo tài khoản admin + nạp dữ liệu demo
#
# Backend không dùng godotenv, chỉ đọc os.Getenv. Makefile `include` .env.dev
# rồi `export` để nạp biến cho `go run` - đó là lý do phải chạy qua make.

SHELL := /bin/bash
ENV_FILE := .env.dev

ifeq (,$(wildcard $(ENV_FILE)))
$(error Không tìm thấy $(ENV_FILE). File này được commit trong repo - hãy `git checkout $(ENV_FILE)`)
endif

include $(ENV_FILE)
export

COMPOSE := docker compose --env-file $(ENV_FILE) -f docker-compose.dev.yml
DB_CONTAINER := cqa-dev-db
API := http://$(SERVER_HOST):$(SERVER_PORT)

# `export` ở trên đẩy mọi biến của .env.dev vào môi trường, kể cả khi chạy test.
# backend/config/config_test.go kiểm tra GIÁ TRỊ MẶC ĐỊNH nên phải chạy với env
# sạch, nếu không nó thấy DB_NAME=cqa_dev và báo fail sai.
CONFIG_VARS := APP_ENV SERVER_HOST SERVER_PORT DB_HOST DB_PORT DB_USER \
               DB_PASSWORD DB_NAME MYSQL_ROOT_PASSWORD JWT_SECRET ENCRYPTION_KEY \
               RATE_LIMIT_PER_IP RATE_LIMIT_PER_USER AI_MAX_TOKENS
CLEAN_ENV := env $(foreach v,$(CONFIG_VARS),-u $(v))

.DEFAULT_GOAL := help
.PHONY: help check setup db-up db-down db-reset db-shell db-logs \
        backend frontend dev seed test test-go test-fe init-storage clean

help: ## Hiện danh sách lệnh
	@echo "Chat Quality Agent - lệnh dev"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' Makefile \
		| awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  Frontend: http://localhost:3000   API: $(API)"

check: ## Kiểm tra toolchain và cổng
	@echo "==> Toolchain"
	@command -v go      >/dev/null || { echo "  THIẾU go (cần >= 1.25)"; exit 1; }
	@command -v node    >/dev/null || { echo "  THIẾU node"; exit 1; }
	@command -v docker  >/dev/null || { echo "  THIẾU docker"; exit 1; }
	@printf "  go      %s\n" "$$(go version | awk '{print $$3}')"
	@printf "  node    %s\n" "$$(node --version)"
	@printf "  docker  %s\n" "$$(docker --version | awk '{print $$3}' | tr -d ,)"
	@docker info >/dev/null 2>&1 || { echo "  Docker daemon chưa chạy"; exit 1; }
	@echo "==> Cổng"
	@for p in 3000 $(SERVER_PORT); do \
		if lsof -nP -iTCP:$$p -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "  :$$p ĐANG BỊ CHIẾM"; else echo "  :$$p trống"; fi; \
	done

setup: check ## Cài dependency + bật DB (chạy 1 lần khi mới clone)
	@echo "==> Go modules"
	@cd backend && go mod download
	@echo "==> npm ci (frontend)"
	@cd frontend && npm ci
	@$(MAKE) --no-print-directory db-up
	@echo
	@echo "Xong. Tiếp theo:  make dev   (rồi make seed ở terminal khác)"
	@echo "Nếu cần test upload file, chạy thêm: make init-storage"

db-up: ## Bật MySQL dev và chờ healthy
	@$(COMPOSE) up -d
	@printf "==> Chờ MySQL sẵn sàng"
	@for i in $$(seq 1 60); do \
		s=$$(docker inspect -f '{{.State.Health.Status}}' $(DB_CONTAINER) 2>/dev/null || echo starting); \
		if [ "$$s" = "healthy" ]; then echo " OK"; exit 0; fi; \
		printf "."; sleep 1; \
	done; \
	echo " QUÁ HẠN"; $(COMPOSE) logs --tail=40 db; exit 1

db-down: ## Tắt MySQL dev (giữ nguyên dữ liệu)
	@$(COMPOSE) down

db-reset: ## Xoá sạch DB dev rồi bật lại (backend sẽ tự AutoMigrate)
	@$(COMPOSE) down -v
	@$(MAKE) --no-print-directory db-up

db-shell: ## Mở mysql client trong container
	@docker exec -it $(DB_CONTAINER) mysql -u$(DB_USER) -p$(DB_PASSWORD) $(DB_NAME)

db-logs: ## Xem log MySQL
	@$(COMPOSE) logs -f db

backend: db-up ## Chạy backend Go (:8080)
	@echo "==> Backend $(API) (env=$(APP_ENV))"
	@cd backend && go run .

frontend: ## Chạy Vite dev server (:3000)
	@echo "==> Frontend http://localhost:3000"
	@cd frontend && npm run dev

dev: db-up ## Chạy backend + frontend song song
	@echo "==> Backend $(API) | Frontend http://localhost:3000 | Ctrl-C để dừng cả hai"
	@trap 'kill 0' EXIT INT TERM; \
	( cd backend  && go run . 2>&1 | sed 's/^/[api] /' ) & \
	( cd frontend && npm run dev 2>&1 | sed 's/^/[web] /' ) & \
	wait

seed: ## Tạo admin + tenant + dữ liệu demo (backend phải đang chạy)
	@bash scripts/dev-seed.sh

test: test-go test-fe ## Chạy toàn bộ test

test-go: ## Test backend (env sạch, xem CONFIG_VARS ở trên)
	@cd backend && $(CLEAN_ENV) go test ./...

test-fe: ## Test frontend
	@cd frontend && npx vitest run

init-storage: ## Tạo /var/lib/cqa/files (cần sudo, chỉ khi test upload file)
	@echo "==> Cần quyền sudo để tạo /var/lib/cqa/files"
	@sudo mkdir -p /var/lib/cqa/files
	@sudo chown -R "$$(whoami)" /var/lib/cqa
	@echo "OK: /var/lib/cqa/files"

clean: ## Xoá DB dev, node_modules và binary Go
	@$(COMPOSE) down -v
	@rm -rf frontend/node_modules frontend/dist backend/cqa-server
	@echo "Đã dọn sạch."
