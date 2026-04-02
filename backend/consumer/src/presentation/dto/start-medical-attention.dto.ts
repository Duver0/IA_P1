import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartMedicalAttentionDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsString()
  pacienteNombre: string;

  @IsNotEmpty()
  @IsString()
  pacienteDocumento: string;
}
