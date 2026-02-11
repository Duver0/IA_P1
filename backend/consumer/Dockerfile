# ⚕️ HUMAN CHECK - Dockerfile del Consumer
# Asegurarse de usar una versión LTS de Node.js compartida con el Producer

# --- Stage: development ---
# ⚕️ HUMAN CHECK - Stage de desarrollo para uso con docker-compose (hot-reload)
FROM node:20-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start:dev"]

# --- Stage: build ---
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage: production ---
FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /app/dist ./dist

# ⚕️ HUMAN CHECK - Variables de Entorno
# El Consumer no expone puerto HTTP necesariamente, pero se puede monitorear
# EXPOSE 3000

CMD ["node", "dist/main.js"]
