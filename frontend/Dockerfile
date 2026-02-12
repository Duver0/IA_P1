# ⚕️ HUMAN CHECK - Dockerfile del Frontend
# Asegurarse de usar una versión LTS de Node.js
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno FRONTEND_PORT
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "-p", "3001", "-H", "0.0.0.0"]
