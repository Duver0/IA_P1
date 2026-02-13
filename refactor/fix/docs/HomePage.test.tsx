/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

// 📂 SHOULD BE LOCATED AT: frontend/src/app/page.test.tsx

// Mock del hook personalizado
jest.mock('../hooks/useTurnosWebSocket', () => ({
    useTurnosWebSocket: () => ({
        turnos: [
            { id: '1', nombre: 'Test Patient', estado: 'espera', consultorio: null },
            { id: '2', nombre: 'Active Patient', estado: 'llamado', consultorio: '1' }
        ],
        error: null,
        connected: true
    })
}));

describe('Home Page', () => {
    it('renders the title', () => {
        render(<Home />);
        const title = screen.getByText(/Turnos Médicos/i);
        expect(title).toBeInTheDocument();
    });

    it('displays connected status', () => {
        render(<Home />);
        const status = screen.getByText(/Conectado/i);
        expect(status).toBeInTheDocument();
    });

    it('renders list of turnos', () => {
        render(<Home />);
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
        expect(screen.getByText('Active Patient')).toBeInTheDocument();
    });
});
