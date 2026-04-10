import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OutboxEventStatus } from '../../domain/entities/outbox-event.entity';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ collection: 'outbox_events', versionKey: false })
export class OutboxEvent {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, enum: ['usuario'] })
  aggregateType: 'usuario';

  @Prop({ required: true })
  aggregateId: string;

  @Prop({ required: true, type: Object })
  payload: unknown;

  @Prop({ required: true, enum: ['PENDING', 'PROCESSED', 'FAILED'], default: 'PENDING' })
  status: OutboxEventStatus;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ default: null })
  processedAt: Date | null;

  @Prop({ required: true, default: 0 })
  retryCount: number;

  @Prop({ required: true, default: Date.now })
  nextAttemptAt: Date;

  @Prop({ default: null })
  lastError: string | null;

  @Prop({ default: null })
  processingAt: Date | null;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxEventSchema.index({ status: 1, nextAttemptAt: 1, processingAt: 1 });
OutboxEventSchema.index({ aggregateType: 1, aggregateId: 1 });