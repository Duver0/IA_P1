import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTurnoDto {
    // ⚕️ HUMAN CHECK - Validaciones del DTO
    // Asegurarse de que las reglas de validación sean suficientes para el negocio
    @IsNotEmpty()
    @IsString()
    // @IsUUID() // Des-comentar si el ID debe ser UUID
    pacienteId: string;

    @IsNotEmpty()
    @IsString()
    nombre: string;
}
