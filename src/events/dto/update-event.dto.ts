import { IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  event_date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  route?: any;
}
