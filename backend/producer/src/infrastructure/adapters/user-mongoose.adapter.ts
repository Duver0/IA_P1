import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRecord, IUserRepository } from '../../domain/ports/IUserRepository';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserMongooseAdapter implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<IUserRecord | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async create(params: {
    email: string;
    passwordHash: string;
    nombre: string;
    rol: string;
  }): Promise<IUserRecord> {
    try {
      const doc = await this.userModel.create({
        email: params.email,
        passwordHash: params.passwordHash,
        nombre: params.nombre,
        rol: params.rol,
        isActive: true,
      });

      return this.toRecord(doc);
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new Error('Email already in use');
      }

      throw error;
    }
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
}