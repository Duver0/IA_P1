# Asegurarse de usar una versión LTS de Bun

# --- Stage: development ---
FROM oven/bun:latest AS development

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends procps \
	&& rm -rf /var/lib/apt/lists/*

COPY producer/bun.lock ./
COPY producer/package.json ./
RUN bun install

# Copiar código fuente (en dev, volumes sobreescriben esto)
COPY producer/ .

EXPOSE 3000

CMD ["bun", "run", "start:dev"]

# --- Stage: build ---
FROM oven/bun:latest AS build

WORKDIR /app

COPY producer/bun.lock ./
COPY producer/package.json ./
RUN bun install

COPY producer/ .
RUN bun run build

# --- Stage: production ---
FROM oven/bun:latest AS production

WORKDIR /app

COPY producer/bun.lock ./
COPY producer/package.json ./
RUN bun install --production

COPY --from=build /app/dist ./dist

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

# Verificar que coincida con la variable de entorno PRODUCER_PORT
EXPOSE 3000

CMD ["bun", "run", "start:prod"]
