import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn, IsPositive, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TurnoPriority } from '../../domain/entities/turno.entity';

export class CreateTurnoDto {



    @ApiProperty({
        description: 'Cédula del paciente',
        example: 123456789,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @Max(Number.MAX_SAFE_INTEGER)
    cedula: number;

    @ApiProperty({
        description: 'Nombre completo del paciente',
        example: 'Juan Pérez',
    })
    @IsNotEmpty()
    @IsString()
    nombre: string;



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
