import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Tipo de Dato
    // Estrictamente numérico
    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsNotEmpty()
    @IsString()
    nombre: string;
}
