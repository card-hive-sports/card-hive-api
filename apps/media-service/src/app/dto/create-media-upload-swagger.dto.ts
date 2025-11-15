import { ApiProperty } from '@nestjs/swagger';
import { CreateMediaUploadDto } from './create-media-upload.dto';

export class CreateMediaUploadSwaggerDto extends CreateMediaUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The media file that will be uploaded',
  })
  file!: unknown;
}
