import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SetDoctorAvailabilityDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsBoolean()
  disponible: boolean;
}
