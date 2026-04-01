import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase, LoginResult, UsuarioResponse } from '../application/use-cases/login.use-case';
import { SignupUseCase, SignupResult } from '../application/use-cases/signup.use-case';
import { GetAllTurnosUseCase } from '../application/use-cases/get-all-turnos.use-case';
import { TurnoEventPayload } from '../domain/entities/turno.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthGuard } from './auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Request } from 'express';

// Respuesta estándar para el frontend (BackendAuthResponse).
interface BackendAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  usuario?: UsuarioResponse;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getAllTurnosUseCase: GetAllTurnosUseCase,
  ) {}

  // POST /auth/signUp — el front envía { email, password, nombre, rol }.
  @Post('signUp')
  @ApiOperation({ summary: 'Registrar usuario interno' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado' })
  async signUp(@Body() dto: SignupDto): Promise<BackendAuthResponse> {
    try {
      const result: SignupResult = await this.signupUseCase.execute(dto);
      return { success: true, message: 'Registro exitoso', token: result.token, usuario: result.usuario };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Error en registro' };
    }
  }

  // POST /auth/signIn — el front envía { email, password }.
  @Post('signIn')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Sesión iniciada' })
  async signIn(@Body() dto: LoginDto): Promise<BackendAuthResponse> {
    try {
      const result: LoginResult = await this.loginUseCase.execute(dto);
      return { success: true, message: 'Login exitoso', token: result.token, usuario: result.usuario };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Error en login' };
    }
  }

  // POST /auth/signOut — cierra sesión (stateless, no-op server-side).
  @Post('signOut')
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 201, description: 'Sesión cerrada' })
  async signOut(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Sesión cerrada' };
  }

  // GET /auth/me — devuelve el usuario actual a partir del Bearer token.
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  @ApiResponse({ status: 200, description: 'Usuario actual' })
  async me(@Req() req: Request): Promise<UsuarioResponse> {
    const authUser = req['authUser'] as Record<string, unknown>;
    return {
      id: authUser.sub as string,
      email: authUser.email as string,
      nombre: authUser.nombre as string,
      rol: authUser.rol as string,
    };
  }

  // Endpoint privado para historial del dashboard, protegido por Bearer token.
  @Get('dashboard-history')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'empleado', 'medico')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar historial de turnos del dashboard' })
  @ApiResponse({ status: 200, description: 'Historial del dashboard' })
  async getDashboardHistory(): Promise<TurnoEventPayload[]> {
    return this.getAllTurnosUseCase.execute();
  }
}