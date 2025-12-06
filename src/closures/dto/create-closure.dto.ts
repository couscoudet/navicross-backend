import {
  IsString,
  IsDateString,
  IsIn,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateClosureDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['barrier', 'segment', 'zone'])
  type: 'barrier' | 'segment' | 'zone';

  @IsObject()
  polygon: any; // GeoJSON Polygon

  @IsOptional()
  @IsObject()
  points?: any;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsOptional()
  @IsString()
  description?: string;
}
