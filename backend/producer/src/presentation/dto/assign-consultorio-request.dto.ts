import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignConsultorioDto {
  @ApiProperty({
    description: 'Identificador del consultorio al que se asociará el médico autenticado',
    example: 'C1',
  })
  @IsNotEmpty()
  @IsString()
  consultorioId: string;
}
