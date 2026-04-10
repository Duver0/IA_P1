import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { IUserRecord, IUserRepository } from '../../domain/ports/IUserRepository';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserMongooseAdapter implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<IUserRecord | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await this.userModel.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async create(
    params: {
      email: string;
      passwordHash: string;
      nombre: string;
      rol: string;
    },
    tx?: TransactionContext,
  ): Promise<IUserRecord> {
    try {
      const mongoSession = this.resolveMongoSession(tx);
      const payload = {
        email: this.normalizeEmail(params.email),
        passwordHash: params.passwordHash,
        nombre: params.nombre,
        rol: params.rol,
        isActive: true,
      };

      const [doc] = mongoSession
        ? await this.userModel.create([payload], { session: mongoSession })
        : await this.userModel.create([payload]);

      if (!doc) {
        throw new Error('No fue posible crear el usuario en MongoDB');
      }

      return this.toRecord(doc);
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new Error('Email already in use');
      }

      throw error;
    }
  }

  private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
    if (!tx) {
      return null;
    }

    if (tx.kind !== 'mongo') {
      throw new Error(`Tipo de transaccion no soportado: ${tx.kind}`);
    }

    return tx.value as ClientSession;
  }

  private toRecord(doc: UserDocument): IUserRecord {
    return {
      id: String(doc._id),
      email: doc.email,
      passwordHash: doc.passwordHash,
      nombre: doc.nombre,
      rol: doc.rol,
      isActive: doc.isActive,
    };
  }

  private isDuplicateEmailError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      code?: number;
      keyPattern?: Record<string, number>;
      keyValue?: Record<string, unknown>;
    };

    return (
      maybeError.code === 11000 &&
      (Boolean(maybeError.keyPattern?.email) || Boolean(maybeError.keyValue?.email))
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}