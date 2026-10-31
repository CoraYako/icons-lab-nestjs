import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateContinentDto } from './dto/create-continent.dto.js';
import { UpdateContinentDto } from './dto/update-continent.dto.js';
import { ContinentService } from '../application/continent.service.js';
import { UUID_V4 } from '../../../common/pipes/uuid-v4.pipe.js';
import { ContinentResponseDto } from './dto/continent-response.dto.js';
import { ContinentSummaryResponseDto } from './dto/continent-summary-response.dto.js';
import { ImageFilePipe } from '../../../storage/image-file.pipe.js';
import { ImageUpload } from '../../../storage/image-upload.decorator.js';

@Controller('continents')
export class ContinentController {
  constructor(private readonly continentService: ContinentService) {}

  @Post()
  async create(
    @Body() request: CreateContinentDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ContinentResponseDto> {
    const response = await this.continentService.create(request);
    res.location(`/api/v1/continents/${response.id}`);
    return response;
  }

  @Get()
  list(): Promise<ContinentSummaryResponseDto[]> {
    return this.continentService.list();
  }

  @Get(':id')
  getById(@Param('id', UUID_V4) id: string): Promise<ContinentResponseDto> {
    return this.continentService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', UUID_V4) id: string,
    @Body() updateContinentDto: UpdateContinentDto,
  ): Promise<ContinentResponseDto> {
    return this.continentService.update(id, updateContinentDto);
  }

  @Put(':id/image')
  @ImageUpload()
  replaceImage(
    @Param('id', UUID_V4) id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
  ): Promise<ContinentResponseDto> {
    return this.continentService.replaceImage(id, file);
  }
}
