import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';

@Injectable()
export class ProducerService {
    constructor(@Inject('TURNOS_SERVICE') private readonly client: ClientProxy) { }

    async createTurno(createTurnoDto: CreateTurnoDto) {
        // ⚕️ HUMAN CHECK - Manejo de errores de publicación
        // Verificar si se requiere una estrategia de reintento o confirmación (confirmChannel)
        try {
            this.client.emit('crear_turno', createTurnoDto);
            // Retornar una confirmación de que la solicitud fue aceptada
            return { status: 'accepted', message: 'Turno en proceso de asignación' };
        } catch (error) {
            console.error('Error publicando mensaje', error);
            throw error;
        }
    }
}
