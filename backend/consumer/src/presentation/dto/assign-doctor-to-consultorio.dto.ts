import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignDoctorToConsultorioDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsString()
  consultorioId: string;
}
