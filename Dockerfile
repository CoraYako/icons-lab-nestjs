# syntax=docker/dockerfile:1
# =============================================================================
# icons-lab · Imagen de la API (NestJS + pnpm)
#
# Etapas:
#   base         → Node + pnpm habilitado (común a todas)
#   deps         → todas las dependencias (incluye devDependencies)
#   development  → para docker-compose local: código fuente + hot reload
#   build        → compila TypeScript → dist/
#   prod-deps    → solo dependencias de producción
#   production   → imagen final: dist/ + node_modules de prod, usuario no-root
#
# Construir la imagen de producción (etapa final, por defecto):
#   docker build -t icons-lab-api .
# =============================================================================

ARG NODE_VERSION=24

# -----------------------------------------------------------------------------
# base
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Corepack instala la versión de pnpm fijada en "packageManager" del package.json
RUN corepack enable


# -----------------------------------------------------------------------------
# deps: instala TODAS las dependencias.
# Se copian solo los manifiestos para aprovechar la caché de capas: si no
# cambian package.json ni el lockfile, Docker reutiliza esta capa y no
# reinstala nada aunque modifiques el código.
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile


# -----------------------------------------------------------------------------
# development: usada por docker-compose (target: development).
# El código se sincroniza desde tu máquina con "docker compose watch".
# -----------------------------------------------------------------------------
FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["pnpm", "start:dev"]


# -----------------------------------------------------------------------------
# build: compila el proyecto a dist/
# -----------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm build


# -----------------------------------------------------------------------------
# prod-deps: solo "dependencies" (sin TypeScript, Vitest, oxlint, etc.)
# -----------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod


# -----------------------------------------------------------------------------
# production: imagen final, mínima. No incluye pnpm, código fuente ni
# devDependencies; corre con el usuario "node" (no root).
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build     --chown=node:node /app/dist         ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

# 1) Aplica migraciones pendientes.
# 2) Si salieron bien, arranca la API.
#    "exec" hace que Node reemplace al shell y reciba las señales de parada.
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && exec node dist/main.js"]