#!/bin/bash
# User-data de arranque para Ubuntu 24.04 LTS: instala Docker + Compose plugin.
set -euxo pipefail

apt-get update -y
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu

# 2 GB de swap: con PostgreSQL + MongoDB + backend, el t3.micro (1 GB) mata
# procesos por falta de memoria sin ella (visto el 07/11/2026).
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab
echo vm.swappiness=10 > /etc/sysctl.d/99-swap.conf
sysctl -p /etc/sysctl.d/99-swap.conf
