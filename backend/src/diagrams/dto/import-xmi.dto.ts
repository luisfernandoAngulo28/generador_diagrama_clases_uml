import { IsNotEmpty, IsString } from 'class-validator';

export class ImportXmiDto {
  @IsString()
  @IsNotEmpty()
  xml: string;
}
