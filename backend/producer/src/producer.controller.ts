import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ProducerService } from './producer.service';
import { CreateTurnoDto } from './dto/create-turno.dto';

@Controller('turnos')
export class ProducerController {
    constructor(private readonly producerService: ProducerService) { }

    @Post()
    @HttpCode(202) // Retorna 202 Accepted
    async createTurno(@Body() createTurnoDto: CreateTurnoDto) {
        return this.producerService.createTurno(createTurnoDto);
    }
}
