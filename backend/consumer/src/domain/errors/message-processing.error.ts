export class DomainRuleError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code = 'DOMAIN_RULE_VIOLATION', context?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.context = context;
  }
}
