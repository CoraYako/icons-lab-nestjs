import {
  applyDecorators,
  FileTypeValidator,
  ParseFilePipe,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME_TYPES = /^image\/(jpeg|png|webp)$/;

export const IMAGE_FILE_PIPE = new ParseFilePipe({
  validators: [new FileTypeValidator({ fileType: IMAGE_MIME_TYPES })],
});

export const ImageUpload = () =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor('file', { limits: { fileSize: IMAGE_MAX_BYTES } }),
    ),
  );
