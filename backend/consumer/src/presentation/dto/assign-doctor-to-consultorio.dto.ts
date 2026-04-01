import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDoctorToConsultorioDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsString()
  consultorioId: string;
}
