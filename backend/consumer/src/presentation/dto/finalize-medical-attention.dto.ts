import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FinalizeMedicalAttentionDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;
}
