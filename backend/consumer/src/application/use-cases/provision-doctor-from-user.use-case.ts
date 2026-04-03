import { Inject, Injectable } from '@nestjs/common';
import { DomainRuleError } from '../../domain/errors/message-processing.error';
import { IDoctorRepository } from '../../domain/ports/IDoctorRepository';
import { DOCTOR_REPOSITORY_TOKEN } from '../../domain/ports/tokens';

export interface ProvisionDoctorFromUserInput {
  commandId: string;
  userId: string;
  email: string;
  nombre: string;
  rol: string;
}

export interface ProvisionDoctorFromUserResult {
  status: 'created' | 'already_exists' | 'ignored';
  doctorId: string | null;
}

@Injectable()
export class ProvisionDoctorFromUserUseCase {
  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(input: ProvisionDoctorFromUserInput): Promise<ProvisionDoctorFromUserResult> {
    if (!input.commandId.trim() || !input.userId.trim() || !input.email.trim() || !input.nombre.trim()) {
      throw new DomainRuleError(
        'Payload de provision de medico invalido',
        'USER_CREATED_PAYLOAD_INVALID',
      );
    }

    if (input.rol !== 'medico') {
      return {
        status: 'ignored',
        doctorId: null,
      };
    }

    const result = await this.doctorRepository.provisionDoctorFromUser({
      userId: input.userId,
      email: input.email,
      nombre: input.nombre,
    });

    return {
      status: result.created ? 'created' : 'already_exists',
      doctorId: result.doctor.id,
    };
  }
}
