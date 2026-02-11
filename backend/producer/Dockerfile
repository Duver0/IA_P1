# ⚕️ HUMAN CHECK - Dockerfile del Producer
# Asegurarse de usar una versión LTS de Node.js
FROM node:20-alpine As build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:20-alpine As production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=build /app/dist ./dist

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno PRODUCER_PORT
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
