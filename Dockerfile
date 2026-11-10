# ---- Build stage ----
FROM node:22.23.4-slim AS build
RUN node -e "if (process.versions.node !== '22.23.4') throw new Error('Unexpected Node runtime')"
WORKDIR /app

# Native build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.webapp.json vite.config.ts drizzle.config.ts ./
COPY src/ src/
COPY webapp/ webapp/
COPY drizzle/ drizzle/
COPY public/ public/

RUN npm run build

# ---- Production stage ----
FROM node:22.23.4-slim
RUN node -e "if (process.versions.node !== '22.23.4') throw new Error('Unexpected Node runtime')"
WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules/ node_modules/
RUN npm prune --omit=dev

# Download findns and dnstt-client for Iranian DNS resolver scanning
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://github.com/SamNet-dev/findns/releases/download/v0.2.2/findns-linux-amd64 \
       -o /usr/local/bin/findns \
  && curl -fsSL https://github.com/SamNet-dev/findns/releases/download/v0.2.2/dnstt-client-linux \
       -o /usr/local/bin/dnstt-client \
  && chmod +x /usr/local/bin/findns /usr/local/bin/dnstt-client

COPY --from=build /app/dist/ dist/
COPY --from=build /app/drizzle/ drizzle/
COPY --from=build /app/public/ public/

RUN mkdir -p /app/data

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3101 3896

ENTRYPOINT ["./docker-entrypoint.sh"]
