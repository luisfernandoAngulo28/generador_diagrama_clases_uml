import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import type { UmlModel } from '../uml.types.js';

export class CreateDiagramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  model: UmlModel;
}
