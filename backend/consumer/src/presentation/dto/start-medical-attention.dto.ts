import { IsNotEmpty, IsString } from 'class-validator';

export class StartMedicalAttentionDto {
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
