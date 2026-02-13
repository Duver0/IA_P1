import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";
import { AppointmentRepository } from "./AppointmentRepository";
import { CreateAppointmentDTO, CreateAppointmentResponse } from "@/domain/CreateAppointment";
import { httpGet, httpPost } from "@/lib/httpClient";

export class HttpAppointmentRepository implements AppointmentRepository {

    async getAppointments(): Promise<Appointment[]> {
        return httpGet<Appointment[]>(`${env.API_BASE_URL}/turnos`);
    }

    async createAppointment(data: CreateAppointmentDTO): Promise<CreateAppointmentResponse> {
        return httpPost<CreateAppointmentResponse>(
            `${env.API_BASE_URL}/turnos`,
            data
        );
    }
}
