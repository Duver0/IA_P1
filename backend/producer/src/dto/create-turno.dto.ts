import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TurnoPriority } from '../types/turno-event';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Validaciones del DTO
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

    // ⚕️ HUMAN CHECK - Prioridad del turno
    // Opcional, default 'media' si no se envía
    @ApiPropertyOptional({
        description: 'Prioridad del turno',
        example: 'media',
        enum: ['alta', 'media', 'baja'],
        default: 'media',
    })
    @IsOptional()
    @IsString()
    @IsIn(['alta', 'media', 'baja'])
    priority?: TurnoPriority;
}
