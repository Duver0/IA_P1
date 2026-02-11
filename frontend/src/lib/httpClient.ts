/**
 * 🛡️ HUMAN CHECK:
 * Cliente HTTP resiliente centralizado.
 * Evita fetch directo en capas superiores.
 */

async function request<T>(
    url: string,
    options: RequestInit,
    retries = 2,
    timeout = 4000
): Promise<T> {
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(id);

            if (!res.ok) {
                if (res.status === 429) throw new Error("RATE_LIMIT");
                if (res.status >= 500) throw new Error("SERVER_ERROR");
                throw new Error("HTTP_ERROR");
            }

            return await res.json();
        } catch (err: any) {
            clearTimeout(id);

            if (err.name === "AbortError") {
                if (i === retries) throw new Error("TIMEOUT");
                continue;
            }

            if (i === retries) throw err;
        }
    }

    throw new Error("UNEXPECTED_HTTP_ERROR");
}

export function httpGet<T>(url: string) {
    return request<T>(url, { method: "GET", cache: "no-store" });
}

export function httpPost<T>(url: string, body: unknown) {
    return request<T>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
