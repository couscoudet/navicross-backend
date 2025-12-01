import { IsString, IsDateString, IsOptional, Matches } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  name: string;

  @IsDateString()
  event_date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  route?: any; // GeoJSON validation can be added later
}
