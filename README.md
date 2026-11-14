# icons-lab · API (NestJS)

API REST de **icons-lab**, un catálogo de **continentes**, **países** e **íconos** (monumentos y lugares emblemáticos, como el Obelisco o las Cataratas del Iguazú). Permite consultar, crear, modificar y borrar esos recursos, cargarles imágenes y controlar el acceso con usuarios y roles (`ADMIN` y `VIEWER`).

Este proyecto es la migración a **NestJS** de una API sencilla hecha originalmente en **Spring Boot**.

> [!IMPORTANT]
> Este repositorio contiene **solo el backend**. No incluye ningún frontend: la API se consume desde un cliente HTTP (Postman, Insomnia, `curl`, etc.) o desde una aplicación cliente que vive en otro repositorio.

---

## Tecnologías

| Área | Tecnología |
|---|---|
| Lenguaje y entorno | [TypeScript](https://www.typescriptlang.org/) 6 · [Node.js](https://nodejs.org/) 24 |
| Framework | [NestJS](https://nestjs.com/) 12 (sobre Express) |
| Base de datos | [PostgreSQL](https://www.postgresql.org/) 16 |
| ORM y migraciones | [TypeORM](https://typeorm.io/) |
| Validación de datos | `class-validator` · `class-transformer` |
| Documentación OpenAPI | `@nestjs/swagger` |
| Seguridad | `bcrypt` (hash de contraseñas) |
| Gestor de paquetes | [pnpm](https://pnpm.io/) |
| Tests | [Vitest](https://vitest.dev/) · Supertest |
| Calidad de código | [oxlint](https://oxc.rs/) · Prettier |
| Contenedores | [Docker](https://www.docker.com/) · Docker Compose |

---

## Contrato de la API

Todos los endpoints, sus datos de entrada y salida, las reglas de validación, los códigos de estado y el formato de errores están definidos en **[API.md](./API.md)**.

Ese documento es el **contrato** de la API: la implementación se ajusta a él, no al revés. Cualquier cambio en los endpoints se hace primero en `API.md` y recién después en el código. Ahí también está la tabla con el **estado de implementación** de cada endpoint.

---

## Cómo levantar el proyecto con Docker

El entorno local se levanta con Docker Compose, que arranca dos contenedores:

| Servicio | Contenedor | Puerto en tu máquina | Qué es |
|---|---|---|---|
| `db` | `icons-lab-db` | `5432` | PostgreSQL 16 |
| `backend` | `icons-lab-backend` | `3000` | La API NestJS, con recarga en caliente |

Al arrancar, el backend **aplica automáticamente las migraciones pendientes** de la base de datos y queda en modo *watch*: cada cambio que hagas en `src/` se copia al contenedor y Nest recompila solo.

### Requisitos previos

> [!WARNING]
> **Es necesario tener Docker instalado en tu máquina** y en ejecución. Sin Docker, estos pasos no funcionan.
>
> - **Linux:** [Docker Engine](https://docs.docker.com/engine/install/) con el plugin [Docker Compose](https://docs.docker.com/compose/install/linux/).
> - **Windows:** [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (se recomienda con el backend de WSL 2). Docker Desktop tiene que estar **abierto** antes de correr los comandos.
>
> La opción `--watch` requiere **Docker Compose 2.22 o superior**. Podés ver tu versión con `docker compose version`.

No hace falta instalar Node.js, pnpm ni PostgreSQL en tu máquina: todo corre dentro de los contenedores.

Para verificar que Docker está instalado y funcionando:

```bash
docker --version
docker compose version
```

### Linux (bash)

```bash
# 1. Clonar el repositorio
git clone https://github.com/CoraYako/icons-lab-nestjs.git
cd icons-lab-nestjs

# 2. Construir las imágenes y levantar los servicios con recarga en caliente
docker compose up --build --watch
```

> Si tu usuario no pertenece al grupo `docker`, anteponé `sudo` a los comandos de Docker, o seguí los [pasos posteriores a la instalación](https://docs.docker.com/engine/install/linux-postinstall/) para usar Docker sin `sudo`.

### Windows (PowerShell)

```powershell
# 1. Clonar el repositorio
git clone https://github.com/CoraYako/icons-lab-nestjs.git
Set-Location icons-lab-nestjs

# 2. Construir las imágenes y levantar los servicios con recarga en caliente
docker compose up --build --watch
```

### Verificar que la API está corriendo

Cuando en la consola aparezca que Nest terminó de iniciar, la API responde en:

```
http://localhost:3000/api/v1
```

Para ver los logs solo del backend (desde otra terminal):

```bash
docker compose logs -f backend
```

### Comandos útiles

Son los mismos en Linux y en PowerShell:

| Acción | Comando |
|---|---|
| Levantar con recarga en caliente | `docker compose up --build --watch` |
| Levantar en segundo plano (sin recarga en caliente) | `docker compose up --build -d` |
| Ver logs del backend | `docker compose logs -f backend` |
| Detener los servicios | `Ctrl + C` o `docker compose down` |
| Detener y **borrar la base de datos** | `docker compose down -v` |
| Ejecutar los tests dentro del contenedor | `docker compose exec backend pnpm test` |

> [!CAUTION]
> `docker compose down -v` elimina el volumen `pgdata`, es decir, **todos los datos** de la base local. La próxima vez que levantes el proyecto, las migraciones vuelven a crear las tablas vacías.

### Configuración y credenciales locales

Las variables de entorno del entorno local ya están definidas en [`docker-compose.yml`](./docker-compose.yml), así que no hace falta crear un archivo `.env` para levantar el proyecto con Docker.

| Variable | Valor local |
|---|---|
| `DB_HOST` | `db` (nombre del servicio dentro de la red de Docker) |
| `DB_PORT` | `5432` |
| `DB_USER` / `DB_PASSWORD` | `icons` / `icons` |
| `DB_NAME` | `icons_lab` |
| `PORT` | `3000` |

> [!NOTE]
> Son **credenciales de ejemplo, solo para uso local**. No las uses en ningún otro entorno.

Para conectarte a la base con un cliente como DBeaver, pgAdmin o la extensión de VS Code, usá `localhost:5432` con el usuario, contraseña y base de la tabla anterior.

### Problemas frecuentes

- **El puerto `5432` ya está en uso:** probablemente tengas un PostgreSQL instalado en tu máquina. En `docker-compose.yml`, cambiá el mapeo del servicio `db` de `'5432:5432'` a `'5433:5432'` y conectate desde tu cliente por el puerto `5433`.
- **El puerto `3000` ya está en uso:** cambiá el mapeo del servicio `backend` de `'3000:3000'` a, por ejemplo, `'3001:3000'`, y usá ese puerto en la URL.
- **`unknown flag: --watch`:** tu versión de Docker Compose es anterior a la 2.22. Actualizala, o levantá el proyecto con `docker compose up --build` (sin recarga en caliente: vas a tener que volver a construir para ver tus cambios).
- **Windows: `error during connect` o `cannot find the file specified`:** Docker Desktop no está abierto. Inicialo y esperá a que indique que está en ejecución.
