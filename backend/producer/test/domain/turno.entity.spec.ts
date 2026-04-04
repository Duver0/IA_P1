import { Turno } from '../../src/domain/entities/turno.entity';

describe('Turno (Domain)', () => {
    it('incluye medicoNombre en payload cuando existe', () => {
        const turno = new Turno({
            id: 't0',
            nombre: 'Paciente 0',
            cedula: 999,
            consultorio: 'C1',
            medicoNombre: 'Dr. Nicolas Gomez',
            estado: 'llamado',
            priority: 'media',
            timestamp: 90,
            finAtencionAt: null,
        });

        const payload = turno.toEventPayload();

        expect(payload).toEqual({
            id: 't0',
            nombre: 'Paciente 0',
            cedula: 999,
            consultorio: 'C1',
            medicoNombre: 'Dr. Nicolas Gomez',
            estado: 'llamado',
            priority: 'media',
            timestamp: 90,
        });
    });

    it('incluye finAtencionAt en payload cuando existe', () => {
        // Arrange: entidad con tiempo de finalización.
        const turno = new Turno({
            id: 't1',
            nombre: 'Paciente 1',
            cedula: 123,
            consultorio: '2',
            estado: 'atendido',
            priority: 'alta',
            timestamp: 100,
            finAtencionAt: 200,
        });

        // Act: convertir a payload de evento.
        const payload = turno.toEventPayload();

        // Assert: el campo opcional debe estar presente.
        expect(payload).toEqual({
            id: 't1',
            nombre: 'Paciente 1',
            cedula: 123,
            consultorio: '2',
            estado: 'atendido',
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

        // Act: mapear a payload.
        const payload = turno.toEventPayload();

        // Assert: no debe incluir la propiedad si es null.
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
