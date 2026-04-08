import {
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { GetConsultorioStateUseCase } from '../application/use-cases/get-consultorio-state.use-case';
import { ReleaseConsultorioCommandUseCase } from '../application/use-cases/release-consultorio-command.use-case';
import { ConsultorioStateView } from '../domain/views/consultorio-state.view';
import { MedicalCommandResult } from '../application/use-cases/medical-command-result';

type AuthenticatedRequest = Request & {
  authUser?: {
    sub?: string;
  };
};

@ApiTags('Consultorios')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'empleado')
@Controller('consultorios')
export class ConsultorioOpsController {
  constructor(
    private readonly getConsultorioStateUseCase: GetConsultorioStateUseCase,
    private readonly releaseConsultorioCommandUseCase: ReleaseConsultorioCommandUseCase,
  ) {}

  private assertAuthenticatedUser(req: Request): void {
    const request = req as AuthenticatedRequest;
    const userId = request.authUser?.sub;

    if (!userId || !userId.trim()) {
      throw new UnauthorizedException('Invalid token payload');
    }
  }

  @Get(':consultorioId/estado')
  @ApiOperation({ summary: 'Consultar estado de un consultorio para operacion interna' })
  @ApiResponse({ status: 200, description: 'Estado actual del consultorio' })
  async getConsultorioState(
    @Req() req: Request,
    @Param('consultorioId') consultorioId: string,
  ): Promise<ConsultorioStateView> {
    this.assertAuthenticatedUser(req);
    return this.getConsultorioStateUseCase.execute(consultorioId);
  }

  @Post(':consultorioId/liberar')
  @HttpCode(202)
  @ApiOperation({ summary: 'Liberar consultorio ocupado por un medico (operacion empleado/admin)' })
  @ApiResponse({ status: 202, description: 'Comando encolado para liberar consultorio o consultorio ya libre' })
  async releaseConsultorioById(
    @Req() req: Request,
    @Param('consultorioId') consultorioId: string,
  ): Promise<MedicalCommandResult> {
    this.assertAuthenticatedUser(req);

    const consultorioState = await this.getConsultorioStateUseCase.execute(consultorioId);

    if (consultorioState.estado === 'SinMedico' || !consultorioState.medicoId) {
      return {
        status: 'accepted',
        message: 'El consultorio ya se encuentra libre',
      };
    }

    if (consultorioState.estado === 'EnAtencion') {
      throw new ConflictException('No se puede liberar un consultorio con atencion activa');
    }

    return this.releaseConsultorioCommandUseCase.execute({
      doctorId: consultorioState.medicoId,
    });
  }
}
