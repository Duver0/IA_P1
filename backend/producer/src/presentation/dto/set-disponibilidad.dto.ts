import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDisponibilidadDto {
  @ApiProperty({
    description: 'Nuevo estado de disponibilidad del médico autenticado',
    example: false,
  })
  @IsBoolean()
  disponible: boolean;
}
