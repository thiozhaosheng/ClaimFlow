FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY index.js ./
COPY src ./src

EXPOSE 3001

CMD ["node", "index.js"]
