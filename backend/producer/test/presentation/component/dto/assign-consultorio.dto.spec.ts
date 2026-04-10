import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignConsultorioDto } from '../../../../src/presentation/dto/assign-consultorio.dto';

describe('AssignConsultorioDto (Presentation)', () => {
  it('acepta consultorioId válido', async () => {
    const dto = plainToInstance(AssignConsultorioDto, { consultorioId: 'C1' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza consultorioId vacío', async () => {
    const dto = plainToInstance(AssignConsultorioDto, { consultorioId: '' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.property).toBe('consultorioId');
  });
});
