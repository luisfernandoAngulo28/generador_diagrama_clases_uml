import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { ClassStereotype, RelationType, Visibility } from '../uml.types.js';

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];
const CLASS_STEREOTYPES: ClassStereotype[] = ['enum'];
const RELATION_TYPES: RelationType[] = [
  'ASSOCIATION',
  'AGGREGATION',
  'COMPOSITION',
  'INHERITANCE',
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
];

export class UmlAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsIn(VISIBILITIES)
  visibility: Visibility;

  @IsOptional()
  isPrimaryKey?: boolean;
}

export class UmlOperationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  returnType: string;

  @IsIn(VISIBILITIES)
  visibility: Visibility;

  @IsOptional()
  @IsString()
  parameters?: string;
}

class PositionDto {
  x: number;
  y: number;
}

export class UmlClassDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UmlAttributeDto)
  attributes: UmlAttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UmlOperationDto)
  operations?: UmlOperationDto[];

  @IsOptional()
  @IsIn(CLASS_STEREOTYPES)
  stereotype?: ClassStereotype;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;
}

export class UmlRelationDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsIn(RELATION_TYPES)
  type: RelationType;

  @IsString()
  @IsNotEmpty()
  sourceClassId: string;

  @IsString()
  @IsNotEmpty()
  targetClassId: string;

  @IsOptional()
  @IsString()
  sourceRole?: string;

  @IsOptional()
  @IsString()
  targetRole?: string;
}

export class UmlModelDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UmlClassDto)
  classes: UmlClassDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UmlRelationDto)
  relations: UmlRelationDto[];
}
