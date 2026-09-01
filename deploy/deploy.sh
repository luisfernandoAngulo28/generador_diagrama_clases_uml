#!/bin/bash
# Ejecutar en la instancia EC2, dentro del repo, tras "git pull".
set -euxo pipefail

cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f
