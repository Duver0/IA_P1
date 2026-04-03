export interface IOutboxEventPublisher {
  publish(event: string, payload: unknown): Promise<void>;
}