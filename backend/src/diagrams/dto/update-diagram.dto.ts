import { PartialType } from '@nestjs/mapped-types';
import { CreateDiagramDto } from './create-diagram.dto.js';

export class UpdateDiagramDto extends PartialType(CreateDiagramDto) {}
