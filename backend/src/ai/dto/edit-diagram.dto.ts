import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { UmlModelDto } from '../../diagrams/dto/uml-model.dto.js';

export class EditDiagramDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => UmlModelDto)
  model: UmlModelDto;
}
