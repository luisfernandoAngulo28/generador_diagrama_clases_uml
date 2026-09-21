# =============================================================================
# deploy-local-build.ps1 - Deploy al VPS sin compilar en el servidor
# =============================================================================
# PROBLEMA: t3.micro (1 GB RAM) hace OOM Kill en "nest build" silenciosamente.
# SOLUCION: Compilar localmente, subir dist/ por SCP, restart del contenedor.
#
# USO:
#   .\deploy\deploy-local-build.ps1              # backend + frontend
#   .\deploy\deploy-local-build.ps1 -BackendOnly # solo backend
#   .\deploy\deploy-local-build.ps1 -FrontendOnly # solo frontend
# =============================================================================

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$PEM     = ".deploy\diagramador-uml-key.pem"
$SERVER  = "ubuntu@34.231.176.225"
$APP_DIR = "app"

function Log-Step { param($msg); Write-Host "`n== $msg ==" -ForegroundColor Cyan }
function Log-Ok   { param($msg); Write-Host "  OK: $msg" -ForegroundColor Green }
function Log-Fail { param($msg); Write-Host "  ERROR: $msg" -ForegroundColor Red; exit 1 }

function Ssh-Run {
    param([string]$Cmd)
    & ssh -i $PEM -o StrictHostKeyChecking=no $SERVER $Cmd
    if ($LASTEXITCODE -ne 0) { Log-Fail "SSH command failed: $Cmd" }
}

# Verificar llave PEM
Log-Step "Verificando llave SSH"
if (-not (Test-Path $PEM)) {
    Log-Fail "No se encontro la llave PEM en '$PEM'. Ejecuta desde la raiz del repo."
}
icacls $PEM /inheritance:r /grant:r "${env:USERNAME}:(R)" 2>$null | Out-Null
Log-Ok "Llave PEM lista: $PEM"

# =========================================================================
# BACKEND
# =========================================================================
if (-not $FrontendOnly) {

    # 1. Compilar localmente
    Log-Step "Compilando backend localmente (npm run build)"
    Push-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Log-Fail "npm run build fallo" }
    Pop-Location
    Log-Ok "Build completado - backend/dist/ listo ($(Get-ChildItem -Recurse backend\dist | Measure-Object | Select-Object -ExpandProperty Count) archivos)"

    # 2. Limpiar dist viejo en el servidor
    Log-Step "Limpiando dist/ anterior en el servidor"
    Ssh-Run "rm -rf ~/$APP_DIR/backend/dist && mkdir -p ~/$APP_DIR/backend/dist"
    Log-Ok "Carpeta dist/ limpiada"

    # 3. Subir dist/ al servidor
    Log-Step "Subiendo dist/ al servidor via SCP"
    & scp -i $PEM -o StrictHostKeyChecking=no -r "backend\dist\" "${SERVER}:~/${APP_DIR}/backend/"
    if ($LASTEXITCODE -ne 0) { Log-Fail "SCP fallo al subir dist/" }
    Log-Ok "dist/ subido correctamente"

    # 4. Subir archivos de config Docker
    Log-Step "Subiendo archivos de configuracion Docker"
    & scp -i $PEM -o StrictHostKeyChecking=no "docker-compose.prod.yml" "${SERVER}:~/${APP_DIR}/"
    if ($LASTEXITCODE -ne 0) { Log-Fail "SCP fallo: docker-compose.prod.yml" }

    & scp -i $PEM -o StrictHostKeyChecking=no "backend\Dockerfile.prod" "${SERVER}:~/${APP_DIR}/backend/"
    if ($LASTEXITCODE -ne 0) { Log-Fail "SCP fallo: Dockerfile.prod" }

    & scp -i $PEM -o StrictHostKeyChecking=no "backend\.dockerignore" "${SERVER}:~/${APP_DIR}/backend/"
    if ($LASTEXITCODE -ne 0) { Log-Fail "SCP fallo: .dockerignore" }
    Log-Ok "Archivos de config subidos"

    # 5. Rebuild y restart del contenedor backend
    Log-Step "Rebuildeando y reiniciando contenedor backend en el VPS"
    Ssh-Run "cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml --env-file .env.production build backend"
    Ssh-Run "cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend"
    Ssh-Run "sudo docker image prune -f"
    Log-Ok "Backend reiniciado"

    # 6. Ver logs para confirmar startup
    Log-Step "Verificando logs del backend (espera 6 segundos para que arranque NestJS)"
    Start-Sleep -Seconds 6
    Ssh-Run "cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml logs --tail=40 backend"
}

# =========================================================================
# FRONTEND (Vite es liviano, puede compilar en el servidor sin OOM)
# =========================================================================
if (-not $BackendOnly) {
    Log-Step "Rebuildeando frontend en el servidor"
    Ssh-Run "cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml --env-file .env.production build frontend"
    Ssh-Run "cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend"
    Ssh-Run "sudo docker image prune -f"
    Log-Ok "Frontend actualizado"
}

# =========================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "  URL: https://diagramasw1pracial100.duckdns.org" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para ver logs en vivo:"
Write-Host "  ssh -i $PEM $SERVER 'cd ~/$APP_DIR && sudo docker compose -f docker-compose.prod.yml logs -f backend'"
