import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

// DTO para solicitudes de registro — alineado con front SignUpData { email, password, name, role }.
// El front envía campos en español (nombre, rol) a través del mapper ACL.
export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @IsIn(['admin', 'empleado', 'medico'])
  rol: string;
}