import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { AssignDoctorToConsultorioCommandUseCase } from '../application/use-cases/assign-doctor-to-consultorio-command.use-case';
import { SetDoctorAvailabilityCommandUseCase } from '../application/use-cases/set-doctor-availability-command.use-case';
import { StartMedicalAttentionCommandUseCase } from '../application/use-cases/start-medical-attention-command.use-case';
import { FinalizeMedicalAttentionCommandUseCase } from '../application/use-cases/finalize-medical-attention-command.use-case';
import { ReleaseConsultorioCommandUseCase } from '../application/use-cases/release-consultorio-command.use-case';
import { MedicalCommandResult } from '../application/use-cases/medical-command-result';
import { AssignConsultorioDto } from './dto/assign-consultorio-request.dto';
import { SetDisponibilidadDto } from './dto/set-disponibilidad.dto';
import { StartMedicalAttentionDto } from './dto/start-medical-attention.dto';

type AuthenticatedRequest = Request & {
  authUser?: {
    sub?: string;
  };
};

@ApiTags('Médicos')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('medico')
@Controller('medicos')
export class MedicalController {
  constructor(
    private readonly assignDoctorToConsultorioCommandUseCase: AssignDoctorToConsultorioCommandUseCase,
    private readonly setDoctorAvailabilityCommandUseCase: SetDoctorAvailabilityCommandUseCase,
    private readonly startMedicalAttentionCommandUseCase: StartMedicalAttentionCommandUseCase,
    private readonly finalizeMedicalAttentionCommandUseCase: FinalizeMedicalAttentionCommandUseCase,
    private readonly releaseConsultorioCommandUseCase: ReleaseConsultorioCommandUseCase,
  ) {}

  private getDoctorId(req: Request): string {
    const request = req as AuthenticatedRequest;
    const doctorId = request.authUser?.sub;

    if (!doctorId || !doctorId.trim()) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return doctorId;
  }

  @Post('consultorio/asignar')
  @HttpCode(202)
  @ApiOperation({ summary: 'Asociar médico autenticado a un consultorio' })
  @ApiBody({ type: AssignConsultorioDto })
  @ApiResponse({ status: 202, description: 'Comando encolado para asociación de consultorio' })
  async assignConsultorio(
    @Req() req: Request,
    @Body() dto: AssignConsultorioDto,
  ): Promise<MedicalCommandResult> {
    return this.assignDoctorToConsultorioCommandUseCase.execute({
      doctorId: this.getDoctorId(req),
      consultorioId: dto.consultorioId,
    });
  }

  @Patch('disponibilidad')
  @HttpCode(202)
  @ApiOperation({ summary: 'Cambiar disponibilidad del médico autenticado' })
  @ApiBody({ type: SetDisponibilidadDto })
  @ApiResponse({ status: 202, description: 'Comando encolado para cambio de disponibilidad' })
  async setDisponibilidad(
    @Req() req: Request,
    @Body() dto: SetDisponibilidadDto,
  ): Promise<MedicalCommandResult> {
    return this.setDoctorAvailabilityCommandUseCase.execute({
      doctorId: this.getDoctorId(req),
      disponible: dto.disponible,
    });
  }

  @Post('atencion/iniciar')
  @HttpCode(202)
  @ApiOperation({ summary: 'Iniciar atención médica para un paciente' })
  @ApiBody({ type: StartMedicalAttentionDto })
  @ApiResponse({ status: 202, description: 'Comando encolado para inicio de atención' })
  async startAttention(
    @Req() req: Request,
    @Body() dto: StartMedicalAttentionDto,
  ): Promise<MedicalCommandResult> {
    return this.startMedicalAttentionCommandUseCase.execute({
      doctorId: this.getDoctorId(req),
      pacienteNombre: dto.pacienteNombre,
      pacienteDocumento: dto.pacienteDocumento,
    });
  }

  @Post('atencion/finalizar')
  @HttpCode(202)
  @ApiOperation({ summary: 'Finalizar atención médica actual' })
  @ApiResponse({ status: 202, description: 'Comando encolado para finalización de atención' })
  async finalizeAttention(@Req() req: Request): Promise<MedicalCommandResult> {
    return this.finalizeMedicalAttentionCommandUseCase.execute({
      doctorId: this.getDoctorId(req),
    });
  }

  @Post('consultorio/liberar')
  @HttpCode(202)
  @ApiOperation({ summary: 'Liberar consultorio del médico autenticado' })
  @ApiResponse({ status: 202, description: 'Comando encolado para liberar consultorio' })
  async releaseConsultorio(@Req() req: Request): Promise<MedicalCommandResult> {
    return this.releaseConsultorioCommandUseCase.execute({
      doctorId: this.getDoctorId(req),
    });
  }
}
