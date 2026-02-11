import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Tipo de Dato y Renombrado
    // Estrictamente numérico, renombrado de 'pacienteId' a 'cedula'
    @IsNotEmpty()
    @IsNumber()
    cedula: number;

    @IsNotEmpty()
    @IsString()
    nombre: string;
}
