import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReleaseConsultorioDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;
}
