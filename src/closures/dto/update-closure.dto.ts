import { IsDateString, IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateClosureDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  polygon?: any;

  @IsOptional()
  @IsObject()
  points?: any;

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
