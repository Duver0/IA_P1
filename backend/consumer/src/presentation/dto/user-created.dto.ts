import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserCreatedDto {
  @IsOptional()
  @IsString()
  commandId?: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['admin', 'empleado', 'medico'])
  rol: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  eventVersion?: number;
}
