import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartMedicalAttentionDto {
  @ApiProperty({
    description: 'Nombre del paciente a atender',
    example: 'Ana Gómez',
  })
  @IsNotEmpty()
  @IsString()
  pacienteNombre: string;

  @ApiProperty({
    description: 'Documento del paciente a atender',
    example: '1032456789',
  })
  @IsNotEmpty()
  @IsString()
  pacienteDocumento: string;
}
