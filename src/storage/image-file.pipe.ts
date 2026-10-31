import { Injectable, PipeTransform } from '@nestjs/common';
import { ApiException } from '../common/exceptions/api.exception.js';

const SIGNATURES: { mimetype: string; matches: (bytes: Buffer) => boolean }[] =
  [
    {
      mimetype: 'image/jpeg',
      matches: (bytes) =>
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
    },
    {
      mimetype: 'image/png',
      matches: (bytes) =>
        bytes.length >= 8 &&
        bytes
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          ),
    },
    {
      mimetype: 'image/webp',
      matches: (bytes) =>
        bytes.length >= 12 &&
        bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP',
    },
  ];

@Injectable()
export class ImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw ApiException.badRequest('The "file" field is required');
    }

    const detected = SIGNATURES.find((signature) =>
      signature.matches(file.buffer),
    );
    if (!detected) {
      throw ApiException.unsupportedMedia('The image must be JPEG, PNG or WebP');
    }

    return { ...file, mimetype: detected.mimetype };
  }
}
