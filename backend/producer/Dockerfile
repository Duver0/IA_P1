# ⚕️ HUMAN CHECK - Dockerfile del Producer
# Asegurarse de usar una versión LTS de Node.js

# --- Stage: development ---
# ⚕️ HUMAN CHECK - Stage de desarrollo para uso con docker-compose (hot-reload)
FROM node:20-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# --- Stage: build ---
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# --- Stage: production ---
FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=build /app/dist ./dist

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno PRODUCER_PORT
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
