// 🛡️ HUMAN CHECK:
// Se agregó validación runtime para evitar crash si falta variable.
// En producción, la app debe fallar de forma controlada.

function required(name: string, value?: string) {
    if (!value) {
        throw new Error(`Missing env variable: ${name}`);
    }
    return value;
}

export const env = {
    API_BASE_URL: required(
        "NEXT_PUBLIC_API_BASE_URL",
        process.env.NEXT_PUBLIC_API_BASE_URL
    ),

    POLLING_INTERVAL: Number(
        process.env.NEXT_PUBLIC_POLLING_INTERVAL ?? 3000
    ),

    // ⚕️ HUMAN CHECK - URL del WebSocket
    // En producción, usar wss:// (WebSocket seguro)
    WS_URL: required(
        "NEXT_PUBLIC_WS_URL",
        process.env.NEXT_PUBLIC_WS_URL
    ),
};
