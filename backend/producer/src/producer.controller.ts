import { Body, Controller, Get, HttpCode, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ProducerService } from './producer.service';
import { TurnosService } from './turnos/turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';

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
            'para procesamiento asíncrono. El Consumer asignará un consultorio y guardará el turno en MongoDB.',
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
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['pacienteId should not be empty', 'nombre must be a string'],
                },
                error: { type: 'string', example: 'Bad Request' },
                statusCode: { type: 'number', example: 400 },
            },
        },
    })
    async createTurno(@Body() createTurnoDto: CreateTurnoDto) {
        return this.producerService.createTurno(createTurnoDto);
    }

    @Get(':cedula')
    @ApiOperation({
        summary: 'Consultar turnos por cédula',
        description:
            'Busca todos los turnos asignados a un paciente utilizando su número de cédula (pacienteId). ' +
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
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    pacienteId: { type: 'number', example: 123456789 },
                    nombre: { type: 'string', example: 'Juan Pérez' },
                    consultorio: { type: 'number', example: 3 },
                    estado: { type: 'string', example: 'asignado' },
                    createdAt: { type: 'string', example: '2026-02-11T01:55:42.679Z' },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'No se encontraron turnos para la cédula proporcionada',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'No se encontraron turnos para la cédula 123456789' },
                error: { type: 'string', example: 'Not Found' },
                statusCode: { type: 'number', example: 404 },
            },
        },
    })
    async getTurnosByCedula(@Param('cedula', ParseIntPipe) cedula: number) {
        return this.turnosService.findByCedula(cedula);
    }
}
