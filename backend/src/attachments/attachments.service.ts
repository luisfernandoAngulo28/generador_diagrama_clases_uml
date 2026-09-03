import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity.js';
import { S3Service } from './s3.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    private readonly s3: S3Service,
  ) {}

  async upload(
    diagramId: string,
    file: Express.Multer.File,
    author: JwtPayload,
  ): Promise<Attachment> {
    const key = `diagrams/${diagramId}/${randomUUID()}-${sanitizeFileName(file.originalname)}`;
    await this.s3.upload(key, file.buffer, file.mimetype);

    const attachment = this.attachmentsRepository.create({
      diagramId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      s3Key: key,
      uploadedByUserId: author.sub,
      uploadedByUserName: author.name,
    });
    return this.attachmentsRepository.save(attachment);
  }

  listByDiagram(diagramId: string): Promise<Attachment[]> {
    return this.attachmentsRepository.find({
      where: { diagramId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDownloadUrl(id: string): Promise<{ url: string; fileName: string }> {
    const attachment = await this.findOrThrow(id);
    const url = await this.s3.getSignedDownloadUrl(attachment.s3Key, attachment.fileName);
    return { url, fileName: attachment.fileName };
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.findOrThrow(id);
    await this.s3.delete(attachment.s3Key);
    await this.attachmentsRepository.remove(attachment);
  }

  private async findOrThrow(id: string): Promise<Attachment> {
    const attachment = await this.attachmentsRepository.findOneBy({ id });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    return attachment;
  }
}
