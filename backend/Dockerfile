# ⚕️ HUMAN CHECK - Dockerfile del backend
# Verificar que la versión de Node.js es compatible con las dependencias del proyecto
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
