export interface TransactionContext {
  kind: 'mongo';
  value: unknown;
}

export interface IUnitOfWork {
  execute<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}