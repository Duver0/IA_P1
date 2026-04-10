import { DomainRuleError } from '../../../../src/domain/errors/message-processing.error';

describe('DomainRuleError (Domain)', () => {
  it('usa codigo por defecto y mantiene contexto opcional', () => {
    const error = new DomainRuleError('violacion de regla', undefined, { doctorId: 'D1' });

    expect(error.message).toBe('violacion de regla');
    expect(error.code).toBe('DOMAIN_RULE_VIOLATION');
    expect(error.context).toEqual({ doctorId: 'D1' });
  });

  it('permite codigo custom', () => {
    const error = new DomainRuleError('custom', 'CUSTOM_RULE');

    expect(error.code).toBe('CUSTOM_RULE');
  });
});
