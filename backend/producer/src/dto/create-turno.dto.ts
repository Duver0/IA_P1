import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Validaciones del DTO
    // Asegurarse de que las reglas de validación sean suficientes para el negocio
    // ⚕️ HUMAN CHECK - Tipo de Dato y Renombrado
    // Se cambió de string a number y de 'pacienteId' a 'cedula' para reflejar el dominio
    @ApiProperty({
        description: 'Cédula del paciente',
        example: 123456789,
    })
    @IsNotEmpty()
    @IsNumber()
    cedula: number;

    @ApiProperty({
        description: 'Nombre completo del paciente',
        example: 'Juan Pérez',
    })
    @IsNotEmpty()
    @IsString()
    nombre: string;
}
