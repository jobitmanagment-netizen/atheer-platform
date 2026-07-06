FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev && npm install better-sqlite3 pg knex ccxt fastify @fastify/cors @fastify/rate-limit @fastify/websocket @fastify/static
COPY --from=build /app/dist ./dist
COPY server/ ./server/
EXPOSE 5173
ENV NODE_ENV=production
ENV PORT=5173
CMD ["node", "server/index.mjs"]
