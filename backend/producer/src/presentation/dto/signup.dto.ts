import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';



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