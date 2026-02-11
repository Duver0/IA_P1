// 🛡️ HUMAN CHECK:
// La IA inicialmente acopló el fetch directamente en el componente.
// Se movió a Repository Pattern para permitir cambiar a SSE/WebSocket
// sin modificar la UI, cumpliendo desacoplamiento.

import { Turno } from "./domain/Turno";
import { TurnoRepository } from "./TurnoRepository";
import { env } from "@/config/env";

export class HttpTurnoRepository implements TurnoRepository {
    async obtenerTurnos(): Promise<Turno[]> {
        const res = await fetch(`${env.API_BASE_URL}/turnos`, {
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error("Error obteniendo turnos");
        }

        return res.json();
    }
}

