import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';

@Controller()
export class ConsumerController {
    @EventPattern('crear_turno')
    async handleCrearTurno(@Payload() data: CreateTurnoDto, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        // ⚕️ HUMAN CHECK - Lógica de Procesamiento de Mensajes
        // Verificar que los datos recibidos tengan la estructura esperada
        console.log(`Recibido mensaje: ${JSON.stringify(data)}`);

        try {
            // Simulando procesamiento (AC 3.2)
            await this.simulateProcessing();

            // Lógica de negocio simulada: Asignar consultorio
            // ⚕️ HUMAN CHECK - Simulación de Lógica de Negocio
            // Reemplazar esto con la lógica real de asignación de turnos (DB, etc.)
            const consultorio = Math.floor(Math.random() * 10) + 1;
            console.log(`Turno asignado al consultorio ${consultorio} para el paciente ${data.pacienteId || 'Desconocido'}`);

            // ⚕️ HUMAN CHECK - Confirmación Manual (Ack)
            // Solo confirmar si el procesamiento fue exitoso.
            channel.ack(originalMsg);
        } catch (error) {
            console.error('Error procesando mensaje', error);
            // Manejo de errores:
            // - Si es un error recuperable, se podría usar channel.nack(originalMsg)
            // - Si es un error fatal (datos inválidos), se podría descartar o enviar a DLQ.
            // Por ahora, solo logueamos y NO hacemos ack (RabbitMQ lo reencolará cuando se cierre la conexión o expire el timeout)
            // O podemos hacer nack explícito:
            // channel.nack(originalMsg, false, false); // false, false = no requeue (DLQ si configurado)
        }
    }

    private simulateProcessing(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
}
