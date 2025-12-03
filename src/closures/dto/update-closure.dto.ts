import { IsDateString, IsOptional, IsObject } from 'class-validator';

export class UpdateClosureDto {
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
}
