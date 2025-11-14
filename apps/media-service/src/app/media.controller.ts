import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import os from 'node:os';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuthorisedUser } from '@card-hive/shared-auth';
import { MediaService } from './media.service';
import { CreateMediaUploadDto } from './dto/create-media-upload.dto';
import { FindMediaFilesQueryDto } from './dto/find-media-files-query.dto';

const MAX_UPLOAD_BYTES = Number(process.env.MEDIA_MAX_UPLOAD_BYTES ?? 524_288_000); // 500 MB
const TEMP_UPLOAD_DIR = os.tmpdir();

const uploadInterceptorOptions = {
  storage: diskStorage({
    destination: TEMP_UPLOAD_DIR,
    filename: (_, file, callback) => {
      const extension = extname(file.originalname);
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
};

@ApiTags('Media Files')
@ApiBearerAuth()
@Controller('files')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadInterceptorOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() payload: CreateMediaUploadDto,
    @AuthorisedUser('id') userID: string,
  ) {
    if (!file) {
      throw new BadRequestException('A file must be provided for upload.');
    }

    return this.mediaService.uploadFile(file, payload, userID);
  }

  @Get()
  async find(@Query() query: FindMediaFilesQueryDto) {
    return this.mediaService.find(query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getByID(id);
  }

  @Get(':id/progress')
  async progress(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getProgress(id);
  }
}
