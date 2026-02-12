import { Body, Controller, Get, HttpCode, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ProducerService, CreateTurnoResponse } from './producer.service';
import { TurnosService } from './turnos/turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnoEventPayload } from './types/turno-event';

@ApiTags('Turnos')
@Controller('turnos')
export class ProducerController {
    constructor(
        private readonly producerService: ProducerService,
        private readonly turnosService: TurnosService,
    ) { }

    @Post()
    @HttpCode(202)
    @ApiOperation({
        summary: 'Crear un nuevo turno',
        description:
            'Recibe los datos del paciente, valida el payload y envía el mensaje a la cola de RabbitMQ ' +
            'para procesamiento asíncrono. El Consumer crea el turno en estado "espera" y el scheduler ' +
            'asigna un consultorio cada 15 segundos. Los cambios se emiten por WebSocket.',
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
    // ⚕️ HUMAN CHECK - Tipo de retorno explícito (coincide con CreateTurnoResponse)
    async createTurno(@Body() createTurnoDto: CreateTurnoDto): Promise<CreateTurnoResponse> {
        return this.producerService.createTurno(createTurnoDto);
    }

    // ⚕️ HUMAN CHECK - Endpoint GET /turnos
    // Retorna todos los turnos ordenados por timestamp ascendente
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
    // ⚕️ HUMAN CHECK - Tipo de retorno explícito (eliminada inferencia implícita)
    async getAllTurnos(): Promise<TurnoEventPayload[]> {
        const turnos = await this.turnosService.findAll();
        return turnos.map(t => this.turnosService.toEventPayload(t));
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
    // ⚕️ HUMAN CHECK - Validación de Parámetros
    // ParseIntPipe asegura que la cédula sea un número antes de llegar al handler
    async getTurnosByCedula(@Param('cedula', ParseIntPipe) cedula: number) {
        return this.turnosService.findByCedula(cedula);
    }
}
