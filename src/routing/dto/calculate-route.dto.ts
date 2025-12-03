import {
  IsArray,
  IsString,
  IsIn,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CalculateRouteDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  origin: [number, number]; // [lng, lat]

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  destination: [number, number]; // [lng, lat]

  @IsString()
  @IsIn(['driving', 'walking', 'cycling', 'foot'])
  profile: 'driving' | 'walking' | 'cycling' | 'foot';

  @IsOptional()
  @IsString()
  eventSlug?: string;
}
