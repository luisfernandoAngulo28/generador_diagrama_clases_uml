import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateDiagramDto } from './create-diagram.dto.js';

export class UpdateDiagramDto extends PartialType(CreateDiagramDto) {
  /**
   * 'AI' when the change comes from operations proposed by the moderator and
   * applied by the asker's client; stamped as source of the new elements.
   */
  @IsOptional()
  @IsIn(['MANUAL', 'AI'])
  source?: 'MANUAL' | 'AI';
}
