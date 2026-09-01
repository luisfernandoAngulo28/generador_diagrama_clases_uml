# Despliegue en AWS (EC2 + Docker Compose)

## Arquitectura

Una sola instancia EC2 corre 3 contenedores vía Docker Compose:

- `frontend`: Nginx sirviendo el build de React y actuando de reverse proxy hacia `backend` para `/diagrams`, `/generator`, `/ai` y `/socket.io` (así solo el puerto 80 queda expuesto).
- `backend`: NestJS.
- `db`: PostgreSQL con volumen persistente.

## 1. Crear la instancia (una sola vez)

- AMI: Amazon Linux 2023
- Tipo: `t3.micro` (free tier / bajo costo)
- Security Group: abrir puerto 22 (SSH, solo tu IP) y puerto 80 (HTTP, 0.0.0.0/0)
- User data: contenido de [`ec2-user-data.sh`](./ec2-user-data.sh) (instala Docker + Compose automáticamente al arrancar)
- Key pair: crear/usar una existente para poder conectarte por SSH

## 2. Primer despliegue

```bash
ssh -i tu-key.pem ec2-user@<IP_PUBLICA>
git clone <URL_DEL_REPO>
cd ExamenSW1
cp .env.production.example .env.production
nano .env.production   # completar DB_PASSWORD y GEMINI_API_KEY reales
bash deploy/deploy.sh
```

## 3. Redeploy tras nuevos cambios

```bash
ssh -i tu-key.pem ec2-user@<IP_PUBLICA>
cd ExamenSW1 && git pull
bash deploy/deploy.sh
```

## 4. Verificar

```bash
curl http://<IP_PUBLICA>/diagrams
```

Y abrir `http://<IP_PUBLICA>/` en el navegador para el canvas.

## Notas

- `DB_SYNCHRONIZE=true` está fijado en `docker-compose.prod.yml`: como el proyecto no usa migraciones formales, TypeORM crea/actualiza el esquema automáticamente al iniciar. Aceptable para un proyecto académico; no usar este patrón en un backend con datos reales de producción.
- El dominio HTTPS (certificado) no está configurado — para la defensa en vivo alcanza con HTTP sobre la IP pública. Si se quiere HTTPS, se puede poner un dominio + Let's Encrypt via Certbot en el propio nginx del contenedor `frontend` (paso opcional, no crítico para el examen).
