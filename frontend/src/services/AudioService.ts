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
    private ready = false;

    /**
     * Inicializa audio una sola vez
     */
    init(src: string, volume = 0.6) {
        if (this.audio) return;

        this.audio = new Audio(src);
        this.audio.volume = volume;
        this.audio.preload = "auto";

        // Marca cuando el audio está listo
        this.audio.addEventListener("canplaythrough", () => {
            this.ready = true;
        });
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
            this.enabled = false;
        }
    }

    /**
     * Reproduce sonido si está habilitado
     */
    play() {
        if (!this.audio || !this.enabled || !this.ready) return;

        try {
            this.audio.currentTime = 0;
            const promise = this.audio.play();

            if (promise !== undefined) {
                promise.catch(() => { });
            }
        } catch { }
    }

    /**
     * Estado del audio
     */
    isEnabled() {
        return this.enabled;
    }
}

export const audioService = new AudioService();
