import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { TurnoEventPayload } from '../domain/entities/turno.entity';
import { ConsultorioRealtimeEventPayload } from '../domain/events/consultorio-realtime.event';

@Injectable()
export class RealtimeEventsBus {
  private readonly emitter = new EventEmitter();

  emitTurnoActualizado(payload: TurnoEventPayload): void {
    this.emitter.emit('turno_actualizado', payload);
  }

  emitConsultorioUpdated(payload: ConsultorioRealtimeEventPayload): void {
    this.emitter.emit('consultorio_updated', payload);
  }

  emitPatientAssigned(payload: ConsultorioRealtimeEventPayload): void {
    this.emitter.emit('patient_assigned', payload);
  }

  emitAttentionFinished(payload: ConsultorioRealtimeEventPayload): void {
    this.emitter.emit('attention_finished', payload);
  }

  onTurnoActualizado(listener: (payload: TurnoEventPayload) => void): void {
    this.emitter.on('turno_actualizado', listener);
  }

  onConsultorioUpdated(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.on('consultorio_updated', listener);
  }

  onPatientAssigned(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.on('patient_assigned', listener);
  }

  onAttentionFinished(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.on('attention_finished', listener);
  }

  offTurnoActualizado(listener: (payload: TurnoEventPayload) => void): void {
    this.emitter.off('turno_actualizado', listener);
  }

  offConsultorioUpdated(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.off('consultorio_updated', listener);
  }

  offPatientAssigned(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.off('patient_assigned', listener);
  }

  offAttentionFinished(listener: (payload: ConsultorioRealtimeEventPayload) => void): void {
    this.emitter.off('attention_finished', listener);
  }
}