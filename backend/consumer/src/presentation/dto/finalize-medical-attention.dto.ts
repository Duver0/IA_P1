import { IsNotEmpty, IsString } from 'class-validator';

export class FinalizeMedicalAttentionDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;
}
