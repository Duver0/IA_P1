# ⚕️ HUMAN CHECK - Dockerfile del frontend
# Verificar que la versión de Node.js es compatible con Next.js
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
