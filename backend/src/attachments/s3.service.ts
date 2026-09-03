import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DOWNLOAD_URL_TTL_SECONDS = 300;

/**
 * Thin wrapper around the AWS S3 SDK. Credentials are picked up from the
 * standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars by the SDK's
 * own default credential chain — nothing to wire up here beyond region and
 * bucket name.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', '');
    this.client = new S3Client({ region: this.config.get<string>('AWS_REGION', 'us-east-1') });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    this.assertConfigured();
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to upload ${key} to S3`, err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException('No se pudo subir el archivo a S3.');
    }
  }

  async getSignedDownloadUrl(key: string, fileName: string): Promise<string> {
    this.assertConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
  }

  async delete(key: string): Promise<void> {
    this.assertConfigured();
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`Failed to delete ${key} from S3`, err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException('No se pudo eliminar el archivo de S3.');
    }
  }

  private assertConfigured(): void {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'S3 no está configurado: falta AWS_S3_BUCKET en las variables de entorno del backend.',
      );
    }
  }
}
