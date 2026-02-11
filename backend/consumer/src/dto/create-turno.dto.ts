import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { TurnoPriority } from '../types/turno-event';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Tipo de Dato y Renombrado
    // Estrictamente numérico, renombrado de 'pacienteId' a 'cedula'
    @IsNotEmpty()
    @IsNumber()
    cedula: number;

    @IsNotEmpty()
    @IsString()
    nombre: string;

    // ⚕️ HUMAN CHECK - Prioridad del turno
    // Opcional, default 'media' si no se envía
    @IsOptional()
    @IsString()
    @IsIn(['alta', 'media', 'baja'])
    priority?: TurnoPriority;
}
