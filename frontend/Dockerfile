# Asegurarse de usar una versión LTS de Bun

# --- Stage: development ---
FROM oven/bun:latest AS development

WORKDIR /app

COPY bun.lock ./
COPY package.json ./
RUN bun install

COPY . .

EXPOSE 3001

CMD ["bun", "run", "dev", "--", "-p", "3001", "-H", "0.0.0.0"]

# --- Stage: build ---
FROM oven/bun:latest AS build

WORKDIR /app

# Estos deben especificarse en docker-compose o CLI
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_WS_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY bun.lock ./
COPY package.json ./
RUN bun install

COPY . .

RUN bun run build

# --- Stage: production ---
FROM oven/bun:latest AS production

WORKDIR /app

COPY bun.lock ./
COPY package.json ./
RUN bun install --production

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

# Verificar que coincida con la variable de entorno FRONTEND_PORT
EXPOSE 3001

CMD ["bun", "run", "start"]
