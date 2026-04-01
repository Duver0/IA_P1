import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';

describe('ConsultorioSession (Domain)', () => {
  it('rechaza creación sin identificador de consultorio', () => {
    // Act
    const act = () => ConsultorioSession.crearSinMedico('   ');

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('crea un consultorio inicial en estado SinMedico', () => {
    // Act
    const session = ConsultorioSession.crearSinMedico('C1');

    // Assert
    expect(session.estado).toBe('SinMedico');
    expect(session.medicoId).toBeNull();
    expect(session.pacienteEnAtencion).toBeNull();
    expect(session.noDisponibleDiferido).toBe(false);
  });

  it('asigna médico y pasa a ConMedicoDisponible', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1');

    // Act
    const updated = session.asignarMedico('M1');

    // Assert
    expect(updated.estado).toBe('ConMedicoDisponible');
    expect(updated.medicoId).toBe('M1');
    expect(updated.puedeRecibirPaciente()).toBe(true);
  });

  it('rechaza asignación de médico si el consultorio ya está ocupado', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1');

    // Act
    const act = () => session.asignarMedico('M2');

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('rechaza asignación de médico con identificador inválido', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1');

    // Act
    const act = () => session.asignarMedico('   ');

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('inicia atención y pasa a EnAtencion con datos de paciente', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1');

    // Act
    const updated = session.iniciarAtencion({ nombre: 'Ana', documento: '10203040' });

    // Assert
    expect(updated.estado).toBe('EnAtencion');
    expect(updated.pacienteEnAtencion).toEqual({ nombre: 'Ana', documento: '10203040' });
    expect(updated.puedeRecibirPaciente()).toBe(false);
  });

  it('rechaza iniciar atención cuando el consultorio está no disponible', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1').marcarNoDisponible();

    // Act
    const act = () => session.iniciarAtencion({ nombre: 'Ana', documento: '10203040' });

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('rechaza iniciar atención con datos de paciente inválidos', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1');

    // Act
    const act = () => session.iniciarAtencion({ nombre: 'Ana', documento: '   ' });

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('rechaza marcar no disponible cuando no hay médico asociado', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1');

    // Act
    const act = () => session.marcarNoDisponible();

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('mantiene estado cuando ya está en ConMedicoNoDisponible', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1').marcarNoDisponible();

    // Act
    const updated = session.marcarNoDisponible();

    // Assert
    expect(updated).toBe(session);
  });

  it('difiere no disponibilidad cuando se solicita durante EnAtencion', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });

    // Act
    const updated = session.marcarNoDisponible();

    // Assert
    expect(updated.estado).toBe('EnAtencion');
    expect(updated.noDisponibleDiferido).toBe(true);
  });

  it('finaliza atención y pasa a ConMedicoNoDisponible cuando hay intención diferida', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' })
      .marcarNoDisponible();

    // Act
    const updated = session.finalizarAtencion();

    // Assert
    expect(updated.estado).toBe('ConMedicoNoDisponible');
    expect(updated.pacienteEnAtencion).toBeNull();
    expect(updated.noDisponibleDiferido).toBe(false);
  });

  it('finaliza atención y vuelve a ConMedicoDisponible cuando no hay intención diferida', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });

    // Act
    const updated = session.finalizarAtencion();

    // Assert
    expect(updated.estado).toBe('ConMedicoDisponible');
    expect(updated.pacienteEnAtencion).toBeNull();
  });

  it('rechaza finalizar atención cuando no existe atención activa', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1');

    // Act
    const act = () => session.finalizarAtencion();

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('abandona consultorio y pasa a SinMedico cuando no hay atención activa', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .marcarNoDisponible();

    // Act
    const updated = session.abandonarConsultorio();

    // Assert
    expect(updated.estado).toBe('SinMedico');
    expect(updated.medicoId).toBeNull();
    expect(updated.pacienteEnAtencion).toBeNull();
  });

  it('rechaza abandono de consultorio cuando hay atención activa', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });

    // Act
    const act = () => session.abandonarConsultorio();

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('rechaza abandono cuando el consultorio ya está libre', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1');

    // Act
    const act = () => session.abandonarConsultorio();

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('cambia a ConMedicoDisponible cuando estaba en ConMedicoNoDisponible', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1').marcarNoDisponible();

    // Act
    const updated = session.marcarDisponible();

    // Assert
    expect(updated.estado).toBe('ConMedicoDisponible');
    expect(updated.noDisponibleDiferido).toBe(false);
  });

  it('rechaza marcar disponible cuando no hay médico asociado', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1');

    // Act
    const act = () => session.marcarDisponible();

    // Assert
    expect(act).toThrow(ConsultorioDomainError);
  });

  it('cancela noDisponible diferido cuando se marca disponible durante atención', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('M1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' })
      .marcarNoDisponible();

    // Act
    const updated = session.marcarDisponible();

    // Assert
    expect(updated.estado).toBe('EnAtencion');
    expect(updated.noDisponibleDiferido).toBe(false);
  });

  it('mantiene estado cuando ya está en ConMedicoDisponible y se marca disponible', () => {
    // Arrange
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('M1');

    // Act
    const updated = session.marcarDisponible();

    // Assert
    expect(updated).toBe(session);
  });
});