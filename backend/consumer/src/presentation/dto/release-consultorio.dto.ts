import { IsNotEmpty, IsString } from 'class-validator';

export class ReleaseConsultorioDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;
}
