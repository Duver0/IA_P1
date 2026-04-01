import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SetDoctorAvailabilityDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsBoolean()
  disponible: boolean;
}
