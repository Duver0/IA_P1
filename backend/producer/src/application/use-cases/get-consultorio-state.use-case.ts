import { Inject, Injectable } from '@nestjs/common';
import { IConsultorioStateReader } from '../../domain/ports/IConsultorioStateReader';
import { CONSULTORIO_STATE_READER_TOKEN } from '../../domain/ports/tokens';
import { ConsultorioStateView } from '../../domain/views/consultorio-state.view';

@Injectable()
export class GetConsultorioStateUseCase {
  constructor(
    @Inject(CONSULTORIO_STATE_READER_TOKEN)
    private readonly consultorioStateReader: IConsultorioStateReader,
  ) {}

  async execute(consultorioId: string): Promise<ConsultorioStateView> {
    const state = await this.consultorioStateReader.findByConsultorioId(consultorioId);

    if (state) {
      return state;
    }

    return {
      consultorioId,
      medicoId: null,
      medicoNombre: null,
      estado: 'SinMedico',
      patientId: null,
      timestamp: Date.now(),
    };
  }
}