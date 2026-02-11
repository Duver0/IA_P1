import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Tipo de Dato
    // Estrictamente numérico
    @IsNotEmpty()
    @IsNumber()
    cedula: number;

    @IsNotEmpty()
    @IsString()
    nombre: string;
}
