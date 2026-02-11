import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Validaciones del DTO
    // Asegurarse de que las reglas de validación sean suficientes para el negocio
    @ApiProperty({
        description: 'Identificador único del paciente',
        example: 'PAC-001',
    })
    @IsNotEmpty()
    @IsString()
    pacienteId: string;

    @ApiProperty({
        description: 'Nombre completo del paciente',
        example: 'Juan Pérez',
    })
    @IsNotEmpty()
    @IsString()
    nombre: string;
}
