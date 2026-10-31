import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { webcrypto } from 'node:crypto';
import { ApiException } from '../common/exceptions/api.exception.js';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly objectsUrl: string;
  private readonly secretKey: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const bucketName = config.getOrThrow<string>('SUPABASE_BUCKET');
    this.objectsUrl = `${config.getOrThrow<string>('SUPABASE_URL')}/storage/v1/object/${bucketName}`;
    this.secretKey = config.getOrThrow<string>('SUPABASE_SECRET_KEY');
    this.publicBaseUrl = config.getOrThrow<string>('STORAGE_PUBLIC_BASE_URL');
  }

  async upload(key: string, file: Express.Multer.File): Promise<string> {
    const response = await fetch(`${this.objectsUrl}/${key}`, {
      method: 'POST',
      headers: { apiKey: this.secretKey, 'Content-Type': file.mimetype },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      this.logger.error(
        `Unable to upload ${key}: ${response.status} ${await response.text()}`,
      );
      throw ApiException.internalError('Image upload failed');
    }
    return key;
  }

  async remove(key: string): Promise<void> {
    const response = await fetch(`${this.objectsUrl}/${key}`, {
      method: 'DELETE',
      headers: { apikey: this.secretKey },
    });
    if (!response.ok) {
      this.logger.warn(`Could not delete ${key}: ${response.status}`);
    }
  }

  toPublicUrl(key: string | null): string | null {
    return key ? `${this.publicBaseUrl}/${key}` : null;
  }

  async buildKey(prefix: string, file: Express.Multer.File): Promise<string> {
    const digest = await webcrypto.subtle.digest('SHA-256', file.buffer);
    const version = Buffer.from(digest).toString('hex').slice(0, 16);
    return `${prefix}/${version}.${EXTENSIONS[file.mimetype]}`;
  }
}
