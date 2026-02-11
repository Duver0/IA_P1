/**
 * AudioService
 * -----------------------------------------------------
 * Encapsula toda la lógica de sonido del sistema.
 *
 * Responsabilidades:
 * - Cumplir autoplay policy del navegador
 * - Evitar recreación de Audio múltiples veces
 * - Permitir unlock por gesto del usuario
 * - Evitar errores silenciosos
 * - Mantener estado interno
 *
 * Uso:
 *   audioService.init("/sounds/ding.mp3");
 *   await audioService.unlock();
 *   audioService.play();
 */

class AudioService {
    private audio: HTMLAudioElement | null = null;
    private enabled = false;

    /**
     * Inicializa el audio una sola vez
     */
    init(src: string, volume = 0.6) {
        if (this.audio) return;

        this.audio = new Audio(src);
        this.audio.volume = volume;
    }

    /**
     * Desbloquea audio tras interacción del usuario
     */
    async unlock() {
        if (!this.audio || this.enabled) return;

        try {
            await this.audio.play();
            this.audio.pause();
            this.audio.currentTime = 0;
            this.enabled = true;
        } catch {
            // Navegador aún bloquea → silencioso
        }
    }

    /**
     * Reproduce sonido si está habilitado
     */
    play() {
        if (!this.audio || !this.enabled) return;

        this.audio.currentTime = 0;

        this.audio.play().catch(() => {
            // Evita crash si navegador bloquea
        });
    }

    /**
     * Estado del audio
     */
    isEnabled() {
        return this.enabled;
    }
}

export const audioService = new AudioService();
