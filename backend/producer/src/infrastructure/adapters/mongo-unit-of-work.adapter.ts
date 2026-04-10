import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IUnitOfWork, TransactionContext } from '../../domain/ports/IUnitOfWork';

@Injectable()
export class MongoUnitOfWorkAdapter implements IUnitOfWork {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async execute<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();

    try {
      let result: T | undefined;

      await session.withTransaction(async () => {
        result = await work({ kind: 'mongo', value: session });
      });

      if (result === undefined) {
        throw new Error('La transaccion finalizo sin resultado');
      }

      return result;
    } finally {
      await session.endSession();
    }
  }
}