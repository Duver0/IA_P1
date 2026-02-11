import { Turno } from "@/domain/Turno";
import { env } from "@/config/env";
import { TurnoRepository } from "./TurnoRepository";
import { CrearTurnoDTO, CrearTurnoResponse } from "@/domain/CrearTurno";
import { httpGet, httpPost } from "@/lib/httpClient";

export class HttpTurnoRepository implements TurnoRepository {

    async obtenerTurnos(): Promise<Turno[]> {
        return httpGet<Turno[]>(`${env.API_BASE_URL}/turnos`);
    }

    async crearTurno(data: CrearTurnoDTO): Promise<CrearTurnoResponse> {
        return httpPost<CrearTurnoResponse>(
            `${env.API_BASE_URL}/turnos`,
            data
        );
    }
}
