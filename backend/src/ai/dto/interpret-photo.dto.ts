import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export class InterpretPhotoDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @IsIn(ALLOWED_MEDIA_TYPES)
  mediaType: (typeof ALLOWED_MEDIA_TYPES)[number];
}
