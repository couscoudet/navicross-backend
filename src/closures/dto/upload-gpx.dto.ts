import { IsOptional, IsString } from 'class-validator';

export class UploadGpxDto {
  @IsOptional()
  @IsString()
  description?: string;
}

// Les validations du fichier sont faites dans le service
