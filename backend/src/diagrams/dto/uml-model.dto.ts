import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  Matches,
  IsNumber,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { ClassStereotype, Navigability, RelationType, Visibility } from '../uml.types.js';

/** UML multiplicity: "1", "*", "0..1", "2..5", "1..*". */
export const MULTIPLICITY_PATTERN = /^(\d+|\*)(\.\.(\d+|\*))?$/;
const NAVIGABILITIES: Navigability[] = ['SOURCE_TO_TARGET', 'TARGET_TO_SOURCE'];

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];
const CLASS_STEREOTYPES: ClassStereotype[] = ['enum', 'abstract', 'interface'];
const RELATION_TYPES: RelationType[] = [
  'ASSOCIATION',
  'AGGREGATION',
  'COMPOSITION',
  'INHERITANCE',
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
  'DEPENDENCY',
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

  @IsOptional()
  @IsBoolean()
  isStatic?: boolean;

  @IsOptional()
  @IsBoolean()
  isDerived?: boolean;

  @IsOptional()
  @IsString()
  @Matches(MULTIPLICITY_PATTERN)
  multiplicity?: string;
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

  @IsOptional()
  @IsBoolean()
  isStatic?: boolean;

  @IsOptional()
  @IsBoolean()
  isAbstract?: boolean;
}

// Without decorators the global ValidationPipe (whitelist: true) stripped x/y,
// so every save stored `position: {}` and classes lost their place on reload.
// Optional so a NaN coordinate (JSON null, e.g. from a hidden browser tab)
// doesn't reject the whole save; sanitizeModel then drops that position.
class PositionDto {
  @IsOptional()
  @IsNumber()
  x: number;

  @IsOptional()
  @IsNumber()
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
  @IsString()
  description?: string;

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

  @IsOptional()
  @IsString()
  @Matches(MULTIPLICITY_PATTERN)
  sourceMultiplicity?: string;

  @IsOptional()
  @IsString()
  @Matches(MULTIPLICITY_PATTERN)
  targetMultiplicity?: string;

  @IsOptional()
  @IsIn(NAVIGABILITIES)
  navigability?: Navigability;

  @IsOptional()
  @IsString()
  associationClassId?: string;
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
