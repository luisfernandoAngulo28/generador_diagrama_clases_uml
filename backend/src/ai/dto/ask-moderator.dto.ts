import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskModeratorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
