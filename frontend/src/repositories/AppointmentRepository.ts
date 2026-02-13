import { Appointment } from "@/domain/Appointment";
import { CreateAppointmentDTO, CreateAppointmentResponse } from "@/domain/CreateAppointment";


export interface AppointmentRepository {
    getAppointments(): Promise<Appointment[]>;
    createAppointment(data: CreateAppointmentDTO): Promise<CreateAppointmentResponse>;
}


