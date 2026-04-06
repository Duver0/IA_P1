import { Body, Controller, Get, HttpCode, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnoEventPayload } from '../domain/entities/turno.entity';
import { CreateTurnoUseCase, CreateTurnoResult } from '../application/use-cases/create-turno.use-case';
import { GetAllTurnosUseCase } from '../application/use-cases/get-all-turnos.use-case';
import { GetTurnosByCedulaUseCase } from '../application/use-cases/get-turnos-by-cedula.use-case';

@ApiTags('Turnos')
@Controller('turnos')
export class ProducerController {

    constructor(
        private readonly createTurnoUseCase: CreateTurnoUseCase,
        private readonly getAllTurnosUseCase: GetAllTurnosUseCase,
        private readonly getTurnosByCedulaUseCase: GetTurnosByCedulaUseCase,
    ) { }

    @Post()
    @HttpCode(202)
    @ApiOperation({
        summary: 'Crear un nuevo turno',
        description:
            'Recibe los datos del paciente, valida el payload y envía el mensaje a la cola de RabbitMQ ' +
            'para procesamiento asíncrono. El Consumer crea el turno, intenta asignación inmediata si hay ' +
            'consultorios libres, y el scheduler sigue reasignando cuando se liberan consultorios. ' +
            'Los cambios se emiten por WebSocket.',
    })
    @ApiBody({ type: CreateTurnoDto })
    @ApiResponse({
        status: 202,
        description: 'Turno aceptado y encolado para procesamiento',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'accepted' },
                message: { type: 'string', example: 'Turno en proceso de asignación' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Datos inválidos — campos faltantes, tipos incorrectos o propiedades no permitidas',
    })

    async createTurno(@Body() createTurnoDto: CreateTurnoDto): Promise<CreateTurnoResult> {
        return this.createTurnoUseCase.execute(createTurnoDto);
    }



    @Get()
    @ApiOperation({
        summary: 'Listar todos los turnos',
        description:
            'Retorna todos los turnos del sistema ordenados por timestamp ascendente. ' +
            'Incluye turnos en espera, llamados y atendidos.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lista de turnos',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'uuid' },
                    nombre: { type: 'string', example: 'Juan Pérez' },
                    cedula: { type: 'number', example: 123456789 },
                    consultorio: { type: 'string', example: '3', nullable: true },
                    estado: { type: 'string', example: 'llamado', enum: ['espera', 'llamado', 'atendido'] },
                    priority: { type: 'string', example: 'media', enum: ['alta', 'media', 'baja'] },
                    timestamp: { type: 'number', example: 1710000000 },
                },
            },
        },
    })

    async getAllTurnos(): Promise<TurnoEventPayload[]> {
        return this.getAllTurnosUseCase.execute();
    }

    @Get(':cedula')
    @ApiOperation({
        summary: 'Consultar turnos por cédula',
        description:
            'Busca todos los turnos asignados a un paciente utilizando su número de cédula. ' +
            'Retorna la lista de turnos con el consultorio asignado y estado.',
    })
    @ApiParam({
        name: 'cedula',
        description: 'Número de cédula del paciente',
        example: 123456789,
    })
    @ApiResponse({
        status: 200,
        description: 'Turnos encontrados para el paciente',
    })
    @ApiResponse({
        status: 404,
        description: 'No se encontraron turnos para la cédula proporcionada',
    })


    async getTurnosByCedula(@Param('cedula', ParseIntPipe) cedula: number) {
        return this.getTurnosByCedulaUseCase.execute(cedula);
    }
}
