# Despliegue en AWS (EC2 + Docker Compose)

## Estado actual (desplegado)

- **Servidor**: EC2 `t3.micro`, **Ubuntu 24.04 LTS**, región `us-east-1`.
- **IP pública fija (Elastic IP)**: `34.231.176.225`
- **Dominio**: `diagramasw1pracial100.duckdns.org` (DuckDNS, gratuito),
  apuntando a la Elastic IP de arriba.
- **URL**: **https://diagramasw1pracial100.duckdns.org** (HTTP
  redirige automáticamente a HTTPS).
- **Usuario SSH**: `ubuntu` (no `ec2-user` — es Ubuntu, no Amazon Linux)
- **Llave SSH**: `.deploy/diagramador-uml-key.pem` en este repo,
  gitignored — nunca se sube.
- **Almacenamiento de archivos**: S3, bucket
  `diagramador-uml-adjuntos-fernando`.
- **Base de datos**: PostgreSQL 16 en un contenedor Docker dentro del
  mismo servidor (no es RDS — suficiente para el alcance del examen),
  con volumen persistente `app_db_data`.
- **Usuarios IAM** (cada uno con el mínimo permiso necesario):
  - `diagramador-uml-backend-s3` — solo acceso al bucket S3 de arriba;
    es el que usa la aplicación en `.env.production` del servidor.
  - `diagramador-uml-backend-ec2` — `AmazonEC2FullAccess`, usado solo
    para aprovisionar/administrar el servidor (no lo necesita la app).

## Arquitectura

Una sola instancia EC2 corre 3 contenedores vía Docker Compose:

- `frontend`: Nginx sirviendo el build de React y actuando de reverse
  proxy hacia `backend` para `/diagrams`, `/generator`, `/ai`, `/auth`,
  `/attachments` y `/socket.io`. Escucha en 80 (redirige todo a HTTPS,
  salvo el reto ACME de Certbot) y en 443 (TLS real).
- `backend`: NestJS.
- `db`: PostgreSQL con volumen persistente.

## HTTPS (Let's Encrypt)

- Certificado real emitido por Let's Encrypt para
  `diagramasw1pracial100.duckdns.org`, obtenido con Certbot en modo
  `--webroot` (sin detener el servicio). Vive en el host en
  `/etc/letsencrypt/live/diagramasw1pracial100.duckdns.org/` y se monta
  de solo lectura dentro del contenedor `frontend`.
- **Renovación automática**: el paquete `certbot` de Ubuntu instala un
  timer de systemd (`certbot.timer`) que corre `certbot renew` dos
  veces al día. Verificado con `certbot renew --dry-run` (exitoso).
- **Hook post-renovación**: `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`
  reinicia el contenedor `app-frontend-1` después de cada renovación
  real, para que Nginx cargue el certificado nuevo (el contenedor solo
  lee los archivos al arrancar, no los vigila).
- Si se cambia de dominio o se recrea el servidor desde cero, hay que
  volver a pedir el certificado:
  ```bash
  sudo certbot certonly --webroot -w /var/www/certbot \
    -d TU_DOMINIO.duckdns.org --agree-tos -m TU_EMAIL --non-interactive
  ```
  (el directorio `/var/www/certbot` debe existir en el host antes, y
  Nginx debe estar corriendo con la ruta `/.well-known/acme-challenge/`
  ya configurada — ver `frontend/nginx.conf`).

## Conectarse por SSH

```bash
ssh -i .deploy/diagramador-uml-key.pem ubuntu@34.231.176.225
```

## Redesplegar tras un cambio (git push a `main`)

```bash
ssh -i .deploy/diagramador-uml-key.pem ubuntu@34.231.176.225 '
  cd app && git pull && bash deploy/deploy.sh
'
```

## Ver logs / diagnosticar

```bash
ssh -i .deploy/diagramador-uml-key.pem ubuntu@34.231.176.225
cd app
sudo docker compose -f docker-compose.prod.yml logs -f backend   # o db / frontend
sudo docker compose -f docker-compose.prod.yml ps
```

## Variables de entorno de producción

Viven en `app/.env.production` **en el servidor**, nunca en el repo.
Para editarlas:

```bash
ssh -i .deploy/diagramador-uml-key.pem ubuntu@34.231.176.225
nano app/.env.production
cd app && bash deploy/deploy.sh
```

Ver `.env.production.example` en la raíz del repo para la lista
completa: `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `GEMINI_API_KEY`,
`GEMINI_MODEL`, `JWT_SECRET`, `AWS_REGION`, `AWS_S3_BUCKET`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

## Crear el servidor desde cero (si hay que recrearlo)

1. EC2 → Launch instance → **Ubuntu 24.04 LTS**, `t3.micro`.
2. Security Group: abrir puerto 22 (SSH) y 80 (HTTP).
3. Key pair: crear uno nuevo o reusar `diagramador-uml-key`.
4. Asignar una Elastic IP para que la dirección no cambie.
5. Conectarse por SSH y correr:

   ```bash
   sudo apt-get update -y && sudo apt-get install -y ca-certificates curl gnupg git
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update -y
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo usermod -aG docker ubuntu
   ```

6. Clonar el repo, crear `.env.production` con secretos reales, y
   correr `bash deploy/deploy.sh`.

## Notas

- `DB_SYNCHRONIZE=true` está fijado en `docker-compose.prod.yml`: como
  el proyecto no usa migraciones formales, TypeORM crea/actualiza el
  esquema automáticamente al iniciar. Aceptable para un proyecto
  académico; no usar este patrón con datos reales de producción.
- El volumen `app_db_data` sobrevive a `docker compose down` (sin `-v`)
  y a reinicios del servidor, pero **no** sobrevive a terminar la
  instancia EC2 — si vas a terminarla/recrearla, respalda antes con
  `pg_dump`.
- Docker está habilitado para arrancar solo al reiniciar el servidor, y
  cada servicio en `docker-compose.prod.yml` tiene
  `restart: unless-stopped` — un reinicio del servidor recupera la
  aplicación sin intervención manual.
- HTTPS ya está configurado con un certificado real (ver sección
  "HTTPS" arriba) — no hace falta usar la IP ni HTTP para la defensa.
