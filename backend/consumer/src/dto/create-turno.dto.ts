import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTurnoDto {
    @IsNotEmpty()
    @IsString()
    pacienteId: string;

    @IsNotEmpty()
    @IsString()
    nombre: string;
}
