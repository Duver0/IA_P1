# --- Stage: development ---
FROM oven/bun:latest AS development

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends procps \
	&& rm -rf /var/lib/apt/lists/*

COPY consumer/bun.lock ./
COPY consumer/package.json ./
RUN bun install

# Copiar código fuente (en dev, volumes sobreescriben esto)
COPY consumer/ .

CMD ["bun", "run", "start:dev"]

# --- Stage: build ---
FROM oven/bun:latest AS build

WORKDIR /app

COPY consumer/bun.lock ./
COPY consumer/package.json ./
RUN bun install

COPY consumer/ .
RUN bun run build

# --- Stage: production ---
FROM oven/bun:latest AS production

WORKDIR /app

COPY consumer/bun.lock ./
COPY consumer/package.json ./
RUN bun install --production

COPY --from=build /app/dist ./dist

# ⚕️ HUMAN CHECK - Ejecutar como usuario no-root (requerimiento de inmutabilidad)
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

CMD ["bun", "run", "start:prod"]
