import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { TurnoPriority } from '../../domain/entities/turno.entity';

export class CreateTurnoDto {


    @IsNotEmpty()
    @IsNumber()
    cedula: number;

    @IsNotEmpty()
    @IsString()
    nombre: string;



    @IsOptional()
    @IsString()
    @IsIn(['alta', 'media', 'baja'])
    priority?: TurnoPriority;
}
