import { Turno } from '../../src/domain/entities/turno.entity';

describe('Turno (Domain)', () => {
    it('incluye finAtencionAt en payload cuando existe', () => {
        // Arrange: entidad en estado llamado con tiempo de finalización.
        const turno = new Turno({
            id: 't1',
            nombre: 'Paciente 1',
            cedula: 123,
            consultorio: '2',
            estado: 'llamado',
            priority: 'alta',
            timestamp: 100,
            finAtencionAt: 200,
        });

        // Act: convertir la entidad al contrato de evento.
        const payload = turno.toEventPayload();

        // Assert: el campo opcional debe viajar cuando existe.
        expect(payload).toEqual({
            id: 't1',
            nombre: 'Paciente 1',
            cedula: 123,
            consultorio: '2',
            estado: 'llamado',
            priority: 'alta',
            timestamp: 100,
            finAtencionAt: 200,
        });
    });

    it('omite finAtencionAt en payload cuando es null', () => {
        // Arrange: entidad en espera sin tiempo de finalización.
        const turno = new Turno({
            id: 't2',
            nombre: 'Paciente 2',
            cedula: 456,
            consultorio: null,
            estado: 'espera',
            priority: 'media',
            timestamp: 101,
            finAtencionAt: null,
        });

        // Act: mapear a payload para mensajería.
        const payload = turno.toEventPayload();

        // Assert: el payload no debe incluir la propiedad opcional en null.
        expect(payload).toEqual({
            id: 't2',
            nombre: 'Paciente 2',
            cedula: 456,
            consultorio: null,
            estado: 'espera',
            priority: 'media',
            timestamp: 101,
        });
        expect(payload).not.toHaveProperty('finAtencionAt');
    });
});
