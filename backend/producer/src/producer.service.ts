import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';

// ⚕️ HUMAN CHECK - Respuesta tipada del endpoint POST /turnos
// Coincide con el schema de Swagger en producer.controller.ts
export interface CreateTurnoResponse {
    status: 'accepted';
    message: string;
}

@Injectable()
export class ProducerService {
    private readonly logger = new Logger(ProducerService.name);

    constructor(@Inject('TURNOS_SERVICE') private readonly client: ClientProxy) { }

    // ⚕️ HUMAN CHECK - Tipo de retorno explícito (eliminado any implícito)
    async createTurno(createTurnoDto: CreateTurnoDto): Promise<CreateTurnoResponse> {
        // ⚕️ HUMAN CHECK - Manejo de errores de publicación
        // Verificar si se requiere una estrategia de reintento o confirmación (confirmChannel)
        try {
            this.client.emit('crear_turno', createTurnoDto);
            return { status: 'accepted', message: 'Turno en proceso de asignación' };
        } catch (error: unknown) {
            // ⚕️ HUMAN CHECK - Reemplazado console.error por Logger (consistencia con el resto del proyecto)
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error publicando mensaje: ${message}`);
            throw error;
        }
    }
}
