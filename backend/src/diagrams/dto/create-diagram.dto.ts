import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { UmlModelDto } from './uml-model.dto.js';

export class CreateDiagramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => UmlModelDto)
  model: UmlModelDto;
}
