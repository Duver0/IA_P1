// 🛡️ HUMAN CHECK:
// La IA propuso usar valores hardcodeados para la URL del backend.
// Se reemplazó por variables de entorno para evitar acoplamiento
// y permitir despliegue en Docker y múltiples entornos.


export const env = {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL!,
    POLLING_INTERVAL: Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL || 3000),
};

