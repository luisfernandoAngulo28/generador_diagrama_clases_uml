# Guía para volver a desplegar en AWS

El servidor se **terminó el 18/10/2026** para que AWS no siga cobrando.
Esta guía lo levanta de nuevo, con los mismos datos, en unos **30–40 minutos**.

## Qué se conservó

| Qué | Dónde | Notas |
|---|---|---|
| Respaldo de MongoDB (diagramas, bitácora, chat, sesiones) | `.deploy/backups/mongo-20261018-2157.gz` | 13 diagramas, 210 entradas de bitácora, 88 mensajes |
| Respaldo de PostgreSQL (usuarios y adjuntos) | `.deploy/backups/pg-20261018-2157.sql.gz` | `pg_dumpall` |
| Variables de producción | `.deploy/servidor/.env.production` | Gemini, JWT, BD y S3. **Secreto: nunca subirlo a git** |
| Certificado HTTPS | `.deploy/servidor/letsencrypt.tgz` | Vence el **03/12/2026**. Después hay que pedir uno nuevo (paso 6) |
| Llave SSH | `.deploy/diagramador-uml-key.pem` | La misma *key pair* `diagramador-uml-key` sigue en AWS |
| Security Group | `sg-048b8a36b0a03a317` | Puertos 22, 80 y 443 abiertos. No tiene costo |
| Bucket S3 de adjuntos | `diagramador-uml-adjuntos-fernando` | Sigue activo (centavos al mes) |

Todo `.deploy/` está en `.gitignore`.

## Costo mientras está apagado

**≈ 0 USD.** No quedan instancias, discos ni IPs elásticas. Lo único que queda
es el bucket S3, con unos pocos KB (centavos al mes).

Al volver a encenderlo, el costo aproximado es: t3.micro ≈ 7,6 USD/mes + disco
16 GB ≈ 1,3 USD/mes + IP fija ≈ 3,6 USD/mes.

---

## Paso a paso (desde la raíz del repo, en PowerShell)

### 1. Crear el servidor (Ubuntu 24.04, t3.micro)

```powershell
$ami = aws ssm get-parameters --names /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query "Parameters[0].Value" --output text
$id = aws ec2 run-instances --image-id $ami --instance-type t3.micro `
  --key-name diagramador-uml-key --security-group-ids sg-048b8a36b0a03a317 `
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=16,VolumeType=gp3}" `
  --user-data file://deploy/ec2-user-data.sh `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=diagramador-uml}]" `
  --query "Instances[0].InstanceId" --output text
aws ec2 wait instance-running --instance-ids $id
```

El `user-data` instala Docker y Docker Compose automáticamente. Espera unos
**3 minutos** antes de conectarte para que termine.

### 2. IP fija (Elastic IP)

```powershell
$alloc = aws ec2 allocate-address --query AllocationId --output text
aws ec2 associate-address --instance-id $id --allocation-id $alloc
$ip = aws ec2 describe-addresses --allocation-ids $alloc --query "Addresses[0].PublicIp" --output text
$ip
```

### 3. Apuntar el dominio a la IP nueva (lo haces tú, 1 minuto)

En **duckdns.org**, en la fila `diagramasw1pracial100`, escribe la IP nueva en
*current ip* y presiona **update ip**. Para comprobarlo: `nslookup diagramasw1pracial100.duckdns.org`.

### 4. Copiar código, secretos y certificado al servidor

```powershell
$k = ".deploy\diagramador-uml-key.pem"
ssh -i $k -o StrictHostKeyChecking=no ubuntu@$ip "git clone -b feat/mongodb-autoria https://github.com/luisfernandoAngulo28/generador_diagrama_clases_uml.git app && sudo mkdir -p /var/www/certbot"
scp -i $k .deploy\servidor\.env.production ubuntu@${ip}:app/.env.production
scp -i $k .deploy\servidor\letsencrypt.tgz ubuntu@${ip}:/tmp/
ssh -i $k ubuntu@$ip "sudo tar xzf /tmp/letsencrypt.tgz -C / && rm /tmp/letsencrypt.tgz"
```

Si ya se fusionó a `main`, cambia `-b feat/mongodb-autoria` por `-b main`.

### 5. Desplegar (compila el backend en tu PC; el t3.micro se queda sin memoria si compila)

```powershell
.\deploy\deploy-local-build.ps1 -Server ubuntu@$ip
```

Levanta los cuatro contenedores: PostgreSQL, MongoDB, backend y frontend.

### 6. Certificado HTTPS (solo si ya pasó el 03/12/2026)

```powershell
ssh -i $k ubuntu@$ip "sudo apt-get install -y certbot && sudo certbot certonly --webroot -w /var/www/certbot -d diagramasw1pracial100.duckdns.org --agree-tos -m TU_CORREO --non-interactive && cd app && sudo docker compose -f docker-compose.prod.yml restart frontend"
```

Antes de esa fecha no hace falta: el certificado restaurado en el paso 4 sigue siendo válido.

### 7. Restaurar los datos

```powershell
scp -i $k .deploy\backups\mongo-20261018-2157.gz .deploy\backups\pg-20261018-2157.sql.gz ubuntu@${ip}:/tmp/
ssh -i $k ubuntu@$ip "sudo docker exec -i app-mongo-1 mongorestore --archive --gzip --drop < /tmp/mongo-20261018-2157.gz"
ssh -i $k ubuntu@$ip 'gunzip -c /tmp/pg-20261018-2157.sql.gz | sudo docker exec -i app-db-1 sh -c "psql -U \$POSTGRES_USER -d postgres"'
```

En PostgreSQL pueden aparecer avisos de *"role already exists"*: son normales,
porque el contenedor ya crea ese usuario al arrancar. (El usuario de la base sale
de `DB_USERNAME` en `.env.production`; el comando lo lee del propio contenedor.)

### 8. Verificar

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://diagramasw1pracial100.duckdns.org/          # 200
curl.exe -s -o NUL -w "%{http_code}`n" https://diagramasw1pracial100.duckdns.org/auth/me   # 401
```

Después inicia sesión con tu cuenta y abre **Archivo → Mis diagramas**: deben
aparecer los 13 diagramas, por ejemplo "Mi Diagrama Cafeteria".

Finalmente, actualiza la IP en `deploy/deploy-local-build.ps1` (valor por
defecto de `-Server`) y en `deploy/README.md`.

---

## Apagarlo otra vez (después de la defensa)

```powershell
# 1. Respaldo (reemplaza FECHA)
ssh -i $k ubuntu@$ip 'sudo docker exec app-mongo-1 mongodump --db case_tool --archive --gzip > /tmp/mongo-FECHA.gz; sudo docker exec app-db-1 sh -c "pg_dumpall -U \$POSTGRES_USER" | gzip > /tmp/pg-FECHA.sql.gz'
scp -i $k ubuntu@${ip}:/tmp/mongo-FECHA.gz ubuntu@${ip}:/tmp/pg-FECHA.sql.gz .deploy\backups\
# 2. Terminar el servidor y liberar la IP (si no se libera, AWS la sigue cobrando)
aws ec2 terminate-instances --instance-ids $id
aws ec2 wait instance-terminated --instance-ids $id
aws ec2 release-address --allocation-id $alloc
```

## Alternativa sin AWS para la defensa

Toda la aplicación corre en la laptop con Docker Desktop, sin internet si se
usa la IA local:

```powershell
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --env-file .env.production up -d --build
```

Se abre en **http://localhost**. Para que la IA responda con el modelo propio
(`moderador-uml`), Ollama debe estar abierto. Para usar Gemini, agrega
`GEMINI_API_KEY` al `.env.production` local (el valor está en
`.deploy/servidor/.env.production`).
