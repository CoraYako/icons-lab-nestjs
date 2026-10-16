# Contrato de API — icons-lab

|                       |                                                                                                                                                                                 |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Versión de la API** | `v1`                                                                                                                                                                            |
| **Fuente**            | Repositorio `CoraYako/icons-lab` (Java / Spring Boot), commit `1c985d9` — 26/11/2025                                                                                            |
| **Propósito**         | Documentar las rutas expuestas por la versión Java para replicarlas en la versión NestJS, y fijar las reglas transversales (fechas y errores) que la nueva versión debe cumplir |

**Cómo leer este documento**

- Las secciones **1 a 6** describen los endpoints **tal como existen hoy** en Java: rutas, autenticación, cuerpos y
  validaciones.
- Las secciones **7 y 8** son **normativas** para la versión NestJS: formato de fechas y formato de errores.
- La sección **9** lista comportamientos del código Java que **no deben replicarse** y decisiones pendientes para la
  migración.

---

## Índice

1. [Convenciones generales](#1-convenciones-generales)
2. [Autenticación](#2-autenticación)
3. [Resumen de endpoints](#3-resumen-de-endpoints)
4. [Continentes](#4-continentes)
5. [Países](#5-países)
6. [Íconos](#6-íconos)
7. [Formato de fechas y horas](#7-formato-de-fechas-y-horas)
8. [Formato estándar de errores](#8-formato-estándar-de-errores)
9. [Observaciones para la migración](#9-observaciones-para-la-migración)

---

## 1. Convenciones generales

| Aspecto                | Valor                                                                               |
|------------------------|-------------------------------------------------------------------------------------|
| Prefijo base           | `/api/v1`                                                                           |
| Formato de intercambio | JSON (`Content-Type: application/json`)                                             |
| Errores                | `application/problem+json` (ver [sección 8](#8-formato-estándar-de-errores))        |
| Identificadores        | UUID en formato texto (`3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44`)                      |
| Paginación             | Número de página **base 0**, **10 elementos** por página (fijo)                     |
| Actualizaciones        | `PATCH` con semántica parcial: los campos ausentes, `null` o vacíos no se modifican |
| Borrado                | Lógico en países e íconos (el recurso deja de listarse, no se elimina físicamente)  |

### 1.1 Respuesta paginada

Los listados devuelven un objeto con el contenido de la página y sus metadatos. La versión Java serializa el `Page` de
Spring Data; **la versión NestJS debe usar esta estructura**, que coincide con el `PagedModel` de Spring:

```json
{
  "content": [
    /* elementos del recurso */
  ],
  "page": {
    "number": 0,
    "size": 10,
    "totalElements": 27,
    "totalPages": 3
  }
}
```

| Campo                | Tipo      | Descripción                              |
|----------------------|-----------|------------------------------------------|
| `content`            | `array`   | Elementos de la página actual            |
| `page.number`        | `integer` | Número de página (base 0)                |
| `page.size`          | `integer` | Tamaño de página (10)                    |
| `page.totalElements` | `integer` | Total de elementos que cumplen el filtro |
| `page.totalPages`    | `integer` | Total de páginas                         |

---

## 2. Autenticación

- **Esquema:** JWT firmado con HS256, enviado como *Bearer token*.
- **Encabezado:** `Authorization: Bearer <token>`
- **Validez del token:** 1 hora.
- **Sesión:** sin estado (*stateless*); no se usan cookies ni sesiones de servidor.
- **Rutas públicas:** todo lo que está bajo `/api/v1/auth/**`.
- **Rutas protegidas:** todas las demás. Basta con un token válido: la versión Java **no** restringe por rol.

| Situación                                            | Respuesta esperada |
|------------------------------------------------------|--------------------|
| Sin encabezado `Authorization` en una ruta protegida | `401 Unauthorized` |
| Token inválido, mal firmado o vencido                | `401 Unauthorized` |
| Usuario deshabilitado                                | `403 Forbidden`    |

> Ver la [sección 9](#9-observaciones-para-la-migración): la versión Java responde `403` cuando falta el token; el
> contrato establece `401`.

### 2.1 `POST /api/v1/auth/register` — Registrar usuario

**Autenticación:** no requiere.

**Cuerpo de la solicitud**

```json
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "ana.perez@mail.com",
  "password": "Secreta123"
}
```

| Campo       | Tipo     | Obligatorio | Reglas                                                                     |
|-------------|----------|-------------|----------------------------------------------------------------------------|
| `firstName` | `string` | Sí          | No vacío                                                                   |
| `lastName`  | `string` | Sí          | No vacío                                                                   |
| `email`     | `string` | Sí          | Formato de email válido; único en el sistema                               |
| `password`  | `string` | Sí          | Entre 8 y 15 caracteres; al menos una minúscula, una mayúscula y un dígito |

**Respuestas**

| Código            | Cuerpo                       | Cuándo                                                          |
|-------------------|------------------------------|-----------------------------------------------------------------|
| `201 Created`     | *(vacío)*                    | Usuario creado. Se asigna el rol por defecto y queda habilitado |
| `400 Bad Request` | Problem Details con `errors` | Validación fallida                                              |
| `409 Conflict`    | Problem Details              | El email ya está registrado                                     |

### 2.2 `POST /api/v1/auth/login` — Iniciar sesión

**Autenticación:** no requiere.

**Cuerpo de la solicitud**

```json
{
  "email": "ana.perez@mail.com",
  "password": "Secreta123"
}
```

| Campo      | Tipo     | Obligatorio | Reglas                  |
|------------|----------|-------------|-------------------------|
| `email`    | `string` | Sí          | Formato de email válido |
| `password` | `string` | Sí          | No vacío                |

**Respuesta `200 OK`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmEucGVyZXpAbWFpbC5jb20i..."
}
```

| Código             | Cuerpo                       | Cuándo                         |
|--------------------|------------------------------|--------------------------------|
| `200 OK`           | `{ "token": string }`        | Credenciales correctas         |
| `400 Bad Request`  | Problem Details con `errors` | Validación fallida             |
| `401 Unauthorized` | Problem Details              | Email o contraseña incorrectos |
| `403 Forbidden`    | Problem Details              | Usuario deshabilitado          |

---

## 3. Resumen de endpoints

| Método   | Ruta                          | Autenticación | Éxito | Descripción                          |
|----------|-------------------------------|---------------|-------|--------------------------------------|
| `POST`   | `/api/v1/auth/register`       | Pública       | `201` | Registrar usuario                    |
| `POST`   | `/api/v1/auth/login`          | Pública       | `200` | Obtener token JWT                    |
| `POST`   | `/api/v1/continents`          | Bearer        | `201` | Crear continente                     |
| `GET`    | `/api/v1/continents?page={n}` | Bearer        | `200` | Listar continentes (paginado)        |
| `GET`    | `/api/v1/continents/{id}`     | Bearer        | `200` | Obtener continente                   |
| `PATCH`  | `/api/v1/continents/{id}`     | Bearer        | `200` | Actualizar continente                |
| `POST`   | `/api/v1/countries`           | Bearer        | `201` | Crear país                           |
| `GET`    | `/api/v1/countries`           | Bearer        | `200` | Listar países con filtros (paginado) |
| `GET`    | `/api/v1/countries/{id}`      | Bearer        | `200` | Obtener país                         |
| `PATCH`  | `/api/v1/countries/{id}`      | Bearer        | `200` | Actualizar país                      |
| `DELETE` | `/api/v1/countries/{id}`      | Bearer        | `204` | Borrado lógico de país               |
| `POST`   | `/api/v1/icons`               | Bearer        | `201` | Crear ícono                          |
| `GET`    | `/api/v1/icons`               | Bearer        | `200` | Listar íconos con filtros (paginado) |
| `GET`    | `/api/v1/icons/{id}`          | Bearer        | `200` | Obtener ícono                        |
| `PATCH`  | `/api/v1/icons/{id}`          | Bearer        | `200` | Actualizar ícono                     |
| `DELETE` | `/api/v1/icons/{id}`          | Bearer        | `204` | Borrado lógico de ícono              |

Errores comunes a **todas** las rutas protegidas: `401 Unauthorized` (sin token o token inválido) y `403 Forbidden`
(usuario deshabilitado).
Errores comunes a **todas** las rutas con `{id}`: `400 Bad Request` si `{id}` no es un UUID válido, y `404 Not Found` si
el recurso no existe.

---

## 4. Continentes

### Representación — `Continent`

```json
{
  "id": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44",
  "imageURL": "https://cdn.example.com/continents/america.webp",
  "name": "América",
  "countries": [
    "Argentina",
    "Brasil",
    "Chile"
  ]
}
```

| Campo       | Tipo            | Descripción                                                     |
|-------------|-----------------|-----------------------------------------------------------------|
| `id`        | `string` (UUID) | Identificador                                                   |
| `imageURL`  | `string`        | Imagen del continente                                           |
| `name`      | `string`        | Nombre (único)                                                  |
| `countries` | `string[]`      | Nombres de los países del continente; arreglo vacío si no tiene |

### 4.1 `POST /api/v1/continents` — Crear continente

**Cuerpo de la solicitud**

```json
{
  "imageURL": "https://cdn.example.com/continents/america.webp",
  "name": "América"
}
```

| Campo      | Tipo     | Obligatorio | Reglas                                                         |
|------------|----------|-------------|----------------------------------------------------------------|
| `imageURL` | `string` | Sí          | No vacío                                                       |
| `name`     | `string` | Sí          | No vacío; único (se compara sin espacios al inicio y al final) |

**Respuestas**

| Código            | Cuerpo                                                       | Cuándo                                 |
|-------------------|--------------------------------------------------------------|----------------------------------------|
| `201 Created`     | `Continent` + encabezado `Location: /api/v1/continents/{id}` | Creado                                 |
| `400 Bad Request` | Problem Details                                              | Validación fallida o cuerpo ausente    |
| `409 Conflict`    | Problem Details                                              | Ya existe un continente con ese nombre |

### 4.2 `GET /api/v1/continents?page={n}` — Listar continentes

| Parámetro (query) | Tipo      | Obligatorio | Descripción              |
|-------------------|-----------|-------------|--------------------------|
| `page`            | `integer` | Sí          | Número de página, base 0 |

**Respuesta `200 OK`:** respuesta paginada (sección 1.1) con elementos `Continent`.

### 4.3 `GET /api/v1/continents/{id}` — Obtener continente

**Respuesta `200 OK`:** `Continent`.

### 4.4 `PATCH /api/v1/continents/{id}` — Actualizar continente

**Cuerpo de la solicitud** (todos los campos opcionales)

```json
{
  "imageURL": "https://cdn.example.com/continents/america-v2.webp",
  "name": "América"
}
```

| Campo      | Tipo     | Obligatorio | Reglas                                  |
|------------|----------|-------------|-----------------------------------------|
| `imageURL` | `string` | No          | Si viene vacío o `null`, no se modifica |
| `name`     | `string` | No          | Si viene vacío o `null`, no se modifica |

**Respuestas**

| Código            | Cuerpo          | Cuándo                           |
|-------------------|-----------------|----------------------------------|
| `200 OK`          | `Continent`     | Actualizado                      |
| `400 Bad Request` | Problem Details | `{id}` inválido o cuerpo ausente |
| `404 Not Found`   | Problem Details | El continente no existe          |

> No hay endpoint para eliminar continentes.

---

## 5. Países

### Representación — `Country`

```json
{
  "id": "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b",
  "imageURL": "https://cdn.example.com/countries/argentina.webp",
  "name": "Argentina",
  "population": 46000000,
  "area": 2780400.0,
  "continent": "América",
  "icons": [
    "Cataratas del Iguazú",
    "Obelisco"
  ]
}
```

| Campo        | Tipo                | Descripción                                               |
|--------------|---------------------|-----------------------------------------------------------|
| `id`         | `string` (UUID)     | Identificador                                             |
| `imageURL`   | `string`            | Imagen del país                                           |
| `name`       | `string`            | Nombre (único)                                            |
| `population` | `integer` (64 bits) | Cantidad de habitantes                                    |
| `area`       | `number`            | Superficie en km²                                         |
| `continent`  | `string`            | **Nombre** del continente al que pertenece                |
| `icons`      | `string[]`          | Nombres de los íconos del país; arreglo vacío si no tiene |

### 5.1 `POST /api/v1/countries` — Crear país

**Cuerpo de la solicitud**

```json
{
  "imageURL": "https://cdn.example.com/countries/argentina.webp",
  "name": "Argentina",
  "population": 46000000,
  "area": 2780400.0,
  "continentId": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44"
}
```

| Campo         | Tipo            | Obligatorio | Reglas                                |
|---------------|-----------------|-------------|---------------------------------------|
| `imageURL`    | `string`        | Sí          | No vacío                              |
| `name`        | `string`        | Sí          | No vacío; único                       |
| `population`  | `integer`       | Sí          | Mínimo 1                              |
| `area`        | `number`        | Sí          | Mínimo 1                              |
| `continentId` | `string` (UUID) | Sí          | Debe existir un continente con ese id |

**Respuestas**

| Código            | Cuerpo                                                    | Cuándo                                      |
|-------------------|-----------------------------------------------------------|---------------------------------------------|
| `201 Created`     | `Country` + encabezado `Location: /api/v1/countries/{id}` | Creado                                      |
| `400 Bad Request` | Problem Details                                           | Validación fallida o `continentId` inválido |
| `404 Not Found`   | Problem Details                                           | El continente indicado no existe            |
| `409 Conflict`    | Problem Details                                           | Ya existe un país con ese nombre            |

### 5.2 `GET /api/v1/countries` — Listar países con filtros

La versión Java recibe los filtros **en el cuerpo de un `GET`** (ver
la [sección 9](#9-observaciones-para-la-migración)).

**Cuerpo de la solicitud** (todos los filtros son opcionales y se combinan con `AND`)

```json
{
  "pageNumber": 0,
  "countryName": "arg",
  "continentName": "amér",
  "iconsNames": [
    "b7c8d9e0-1f2a-4b3c-8d4e-5f6a7b8c9d0e"
  ],
  "orderByField": "name"
}
```

| Campo           | Tipo       | Obligatorio | Comportamiento                                                                                                           |
|-----------------|------------|-------------|--------------------------------------------------------------------------------------------------------------------------|
| `pageNumber`    | `integer`  | Sí          | Página, base 0                                                                                                           |
| `countryName`   | `string`   | No          | Coincidencia parcial, sin distinguir mayúsculas                                                                          |
| `continentName` | `string`   | No          | Coincidencia parcial con el nombre del continente, sin distinguir mayúsculas                                             |
| `iconsNames`    | `string[]` | No          | Países que tengan **alguno** de los íconos indicados. Pese al nombre, la versión Java compara contra el **id** del ícono |
| `orderByField`  | `string`   | No          | Nombre de la propiedad por la cual ordenar, ascendente. Por defecto: `id`                                                |

**Respuesta `200 OK`:** respuesta paginada (sección 1.1) con elementos `Country`. Los países borrados lógicamente no se
incluyen.

### 5.3 `GET /api/v1/countries/{id}` — Obtener país

**Respuesta `200 OK`:** `Country`.

### 5.4 `PATCH /api/v1/countries/{id}` — Actualizar país

**Cuerpo de la solicitud** (todos los campos opcionales)

```json
{
  "imageURL": "https://cdn.example.com/countries/argentina-v2.webp",
  "name": "República Argentina",
  "population": 46500000,
  "area": 2780400.0,
  "continentId": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44"
}
```

| Campo         | Tipo            | Obligatorio | Reglas                                         |
|---------------|-----------------|-------------|------------------------------------------------|
| `imageURL`    | `string`        | No          | Si viene vacío o `null`, no se modifica        |
| `name`        | `string`        | No          | Si viene vacío o `null`, no se modifica; único |
| `population`  | `integer`       | No          | Solo se aplica si es mayor que 1               |
| `area`        | `number`        | No          | Solo se aplica si es mayor que 1               |
| `continentId` | `string` (UUID) | No          | Si viene, debe existir el continente           |

**Respuestas**

| Código            | Cuerpo          | Cuándo                                     |
|-------------------|-----------------|--------------------------------------------|
| `200 OK`          | `Country`       | Actualizado                                |
| `400 Bad Request` | Problem Details | `{id}` inválido o cuerpo ausente           |
| `404 Not Found`   | Problem Details | El país o el continente indicado no existe |
| `409 Conflict`    | Problem Details | Ya existe otro país con ese nombre         |

### 5.5 `DELETE /api/v1/countries/{id}` — Borrar país

Borrado lógico.

| Código            | Cuerpo          | Cuándo            |
|-------------------|-----------------|-------------------|
| `204 No Content`  | *(vacío)*       | Borrado           |
| `400 Bad Request` | Problem Details | `{id}` inválido   |
| `404 Not Found`   | Problem Details | El país no existe |

---

## 6. Íconos

### Representación — `Icon`

```json
{
  "id": "b7c8d9e0-1f2a-4b3c-8d4e-5f6a7b8c9d0e",
  "imageURL": "https://cdn.example.com/icons/iguazu.webp",
  "name": "Cataratas del Iguazú",
  "creationDate": "1934-10-09",
  "height": 82,
  "historyDescription": "Sistema de 275 saltos sobre el río Iguazú.",
  "countries": [
    "Argentina",
    "Brasil"
  ]
}
```

| Campo                | Tipo               | Descripción                                                                          |
|----------------------|--------------------|--------------------------------------------------------------------------------------|
| `id`                 | `string` (UUID)    | Identificador                                                                        |
| `imageURL`           | `string`           | Imagen del ícono                                                                     |
| `name`               | `string`           | Nombre (único)                                                                       |
| `creationDate`       | `string` (fecha)   | Fecha de creación del ícono. Formato en la [sección 7](#7-formato-de-fechas-y-horas) |
| `height`             | `integer`          | Altura en metros                                                                     |
| `historyDescription` | `string` \| `null` | Reseña histórica                                                                     |
| `countries`          | `string[]`         | Nombres de los países a los que pertenece                                            |

### 6.1 `POST /api/v1/icons` — Crear ícono

**Cuerpo de la solicitud**

```json
{
  "imageURL": "https://cdn.example.com/icons/iguazu.webp",
  "name": "Cataratas del Iguazú",
  "creationDate": "1934-10-09",
  "height": 82,
  "historyDescription": "Sistema de 275 saltos sobre el río Iguazú.",
  "countryId": "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b"
}
```

| Campo                | Tipo             | Obligatorio | Reglas                                                                           |
|----------------------|------------------|-------------|----------------------------------------------------------------------------------|
| `imageURL`           | `string`         | Sí          | No vacío                                                                         |
| `name`               | `string`         | Sí          | No vacío; único                                                                  |
| `creationDate`       | `string` (fecha) | Sí          | Fecha válida                                                                     |
| `height`             | `integer`        | Sí          | Mínimo 1                                                                         |
| `historyDescription` | `string`         | No          | Texto libre                                                                      |
| `countryId`          | `string` (UUID)  | Sí          | Debe existir el país. Se crea asociado a **un** país; se agregan más con `PATCH` |

**Respuestas**

| Código            | Cuerpo                                             | Cuándo                                          |
|-------------------|----------------------------------------------------|-------------------------------------------------|
| `201 Created`     | `Icon` + encabezado `Location: /api/v1/icons/{id}` | Creado                                          |
| `400 Bad Request` | Problem Details                                    | Validación fallida o fecha con formato inválido |
| `404 Not Found`   | Problem Details                                    | El país indicado no existe                      |
| `409 Conflict`    | Problem Details                                    | Ya existe un ícono con ese nombre               |

### 6.2 `GET /api/v1/icons` — Listar íconos con filtros

La versión Java recibe los filtros **en el cuerpo de un `GET`** (ver
la [sección 9](#9-observaciones-para-la-migración)).

**Cuerpo de la solicitud** (todos los filtros son opcionales y se combinan con `AND`)

```json
{
  "pageNumber": 0,
  "name": "catarata",
  "date": "1934-10-09",
  "countries": [
    "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b"
  ],
  "orderByField": "name"
}
```

| Campo          | Tipo             | Obligatorio | Comportamiento                                                                  |
|----------------|------------------|-------------|---------------------------------------------------------------------------------|
| `pageNumber`   | `integer`        | Sí          | Página, base 0                                                                  |
| `name`         | `string`         | No          | Coincidencia parcial, sin distinguir mayúsculas                                 |
| `date`         | `string` (fecha) | No          | Coincidencia exacta con `creationDate`                                          |
| `countries`    | `string[]`       | No          | Íconos que pertenezcan a **alguno** de los países indicados, por **id** de país |
| `orderByField` | `string`         | No          | Propiedad por la cual ordenar, ascendente. Por defecto: `id`                    |

**Respuesta `200 OK`:** respuesta paginada (sección 1.1) con elementos `Icon`. Los íconos borrados lógicamente no se
incluyen.

### 6.3 `GET /api/v1/icons/{id}` — Obtener ícono

**Respuesta `200 OK`:** `Icon`.

### 6.4 `PATCH /api/v1/icons/{id}` — Actualizar ícono

**Cuerpo de la solicitud** (todos los campos opcionales)

```json
{
  "imageURL": "https://cdn.example.com/icons/iguazu-v2.webp",
  "name": "Cataratas del Iguazú",
  "creationDate": "1934-10-09",
  "height": 82,
  "historyDescription": "Reseña actualizada.",
  "countriesId": [
    "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
  ]
}
```

| Campo                | Tipo              | Obligatorio | Reglas                                                                                       |
|----------------------|-------------------|-------------|----------------------------------------------------------------------------------------------|
| `imageURL`           | `string`          | No          | Si viene vacío o `null`, no se modifica                                                      |
| `name`               | `string`          | No          | Si viene vacío o `null`, no se modifica                                                      |
| `creationDate`       | `string` (fecha)  | No          | Si viene vacío o `null`, no se modifica                                                      |
| `height`             | `integer`         | No          | Solo se aplica si es mayor que 1                                                             |
| `historyDescription` | `string`          | No          | Si viene vacío o `null`, no se modifica                                                      |
| `countriesId`        | `string[]` (UUID) | No          | **Agrega** los países indicados a los que ya tiene; nunca quita países. Cada id debe existir |

**Respuestas**

| Código            | Cuerpo          | Cuándo                                           |
|-------------------|-----------------|--------------------------------------------------|
| `200 OK`          | `Icon`          | Actualizado                                      |
| `400 Bad Request` | Problem Details | `{id}` inválido, cuerpo ausente o fecha inválida |
| `404 Not Found`   | Problem Details | El ícono o alguno de los países no existe        |

### 6.5 `DELETE /api/v1/icons/{id}` — Borrar ícono

Borrado lógico.

| Código            | Cuerpo          | Cuándo             |
|-------------------|-----------------|--------------------|
| `204 No Content`  | *(vacío)*       | Borrado            |
| `400 Bad Request` | Problem Details | `{id}` inválido    |
| `404 Not Found`   | Problem Details | El ícono no existe |

---

## 7. Formato de fechas y horas

> **Normativo para la versión NestJS.**

### 7.1 Fecha y hora: siempre con desplazamiento (*offset*)

Todo valor que represente un **instante** (fecha + hora) se intercambia como **fecha-hora con desplazamiento**, según
**ISO 8601** en el perfil de **RFC 3339**. Es el equivalente a `OffsetDateTime` de Java y a `timestamptz` de PostgreSQL.

```
YYYY-MM-DDTHH:mm:ss[.SSS](Z | ±HH:mm)
```

| Ejemplo                         | Válido | Motivo                                                      |
|---------------------------------|--------|-------------------------------------------------------------|
| `2026-10-15T19:04:05Z`          | ✅     | `Z` equivale a `+00:00` (UTC)                               |
| `2026-10-15T16:04:05.123-03:00` | ✅     | Desplazamiento explícito de Buenos Aires                    |
| `2026-10-15T16:04:05`           | ❌     | Sin desplazamiento: es ambiguo (equivale a `LocalDateTime`) |
| `15/10/2026 16:04`              | ❌     | No es ISO 8601                                              |
| `1760555045`                    | ❌     | Los *timestamps* numéricos no se aceptan                    |

**Reglas**

1. **Respuestas:** el servidor emite los instantes en **UTC con sufijo `Z`** (lo que produce
   `Date.prototype.toISOString()` en JavaScript). El cliente es responsable de mostrarlos en la zona horaria del
   usuario.
2. **Solicitudes:** el servidor acepta cualquier desplazamiento válido (`Z`, `-03:00`, `+05:30`…) y lo normaliza.
   Rechaza con `400` los valores **sin** desplazamiento.
3. **Persistencia:** las columnas de fecha-hora son `timestamptz`.
4. **Alcance:** aplica a todo campo de fecha-hora presente o futuro, incluido el campo `timestamp` de los errores
   (sección 8) y cualquier dato de auditoría (`createdAt`, `updatedAt`) que se exponga.

### 7.2 Fechas sin hora

Un desplazamiento solo tiene sentido cuando hay una hora. Las fechas de calendario, como `creationDate` de los íconos,
se intercambian en **ISO 8601 de fecha**:

```
YYYY-MM-DD        → 1934-10-09
```

Es el equivalente a `LocalDate` de Java y a `date` de PostgreSQL.

> **Cambio respecto a Java:** la versión actual usa el patrón `yyyy/MM/dd` (`1934/10/09`) tanto en las solicitudes como
> en las respuestas y en el filtro `date`. La versión NestJS adopta `YYYY-MM-DD`. Si hay clientes existentes, este cambio
> debe comunicarse.

---

## 8. Formato estándar de errores

> **Normativo para la versión NestJS.**

Todos los errores siguen **RFC 9457 — *Problem Details for HTTP API*** (estándar de la IETF que reemplaza a RFC 7807).
Es el mismo formato que produce la clase `ProblemDetail` de Spring Framework 6+.

- **Content-Type:** `application/problem+json`
- El código HTTP de la respuesta y el campo `status` siempre coinciden.

### 8.1 Estructura

```json
{
  "type": "/problems/resource-not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "Country not found for the ID '8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b'",
  "instance": "/api/v1/countries/8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b",
  "timestamp": "2026-10-15T19:04:05.123Z"
}
```

| Campo       | Tipo                  | Origen    | Descripción                                                                                       |
|-------------|-----------------------|-----------|---------------------------------------------------------------------------------------------------|
| `type`      | `string` (URI)        | RFC 9457  | Identifica el **tipo** de problema. Es estable: los clientes pueden basar su lógica en este valor |
| `title`     | `string`              | RFC 9457  | Resumen legible del tipo de problema. Es el mismo para todas las ocurrencias de un `type`         |
| `status`    | `integer`             | RFC 9457  | Código HTTP                                                                                       |
| `detail`    | `string`              | RFC 9457  | Explicación específica de **esta** ocurrencia                                                     |
| `instance`  | `string` (URI)        | RFC 9457  | Ruta de la solicitud que originó el error                                                         |
| `timestamp` | `string` (fecha-hora) | Extensión | Momento del error, con desplazamiento (sección 7.1)                                               |
| `errors`    | `array`               | Extensión | Solo en errores de validación (sección 8.2)                                                       |

Los valores de `type` usan URI relativas (`/problems/...`). Cuando la API tenga un dominio público, pueden pasar a URI
absolutas que apunten a la documentación de cada error.

### 8.2 Errores de validación

Cuando falla la validación del cuerpo o de los parámetros, se agrega el arreglo `errors` con **un elemento por cada
problema**:

```json
{
  "type": "/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request contains 2 invalid fields.",
  "instance": "/api/v1/countries",
  "timestamp": "2026-10-15T19:04:05.123Z",
  "errors": [
    {
      "field": "name",
      "message": "name should not be empty"
    },
    {
      "field": "population",
      "message": "population must not be less than 1"
    }
  ]
}
```

| Campo de `errors[]` | Tipo     | Descripción                                                               |
|---------------------|----------|---------------------------------------------------------------------------|
| `field`             | `string` | Campo inválido. Los campos anidados usan notación con punto (`page.size`) |
| `message`           | `string` | Motivo                                                                    |

### 8.3 Catálogo de errores

| `status` | `type`                          | `title`               | Cuándo                                                                       | Excepción equivalente en Java                                 |
|----------|---------------------------------|-----------------------|------------------------------------------------------------------------------|---------------------------------------------------------------|
| `400`    | `/problems/validation-error`    | Validation failed     | Falla la validación del cuerpo o de los parámetros                           | `MethodArgumentNotValidException`, `InvalidFieldException`    |
| `400`    | `/problems/malformed-request`   | Malformed request     | JSON mal formado o cuerpo ausente                                            | `HttpMessageNotReadableException`, `NullRequestBodyException` |
| `400`    | `/problems/invalid-identifier`  | Invalid identifier    | `{id}` u otro identificador no es un UUID válido                             | `InvalidUUIDException`                                        |
| `401`    | `/problems/unauthorized`        | Unauthorized          | Falta el token, es inválido, está vencido o las credenciales son incorrectas | `JwtException`, `BadCredentialsException`                     |
| `403`    | `/problems/forbidden`           | Forbidden             | Usuario deshabilitado o sin permisos sobre el recurso                        | `DisabledException`                                           |
| `404`    | `/problems/resource-not-found`  | Resource not found    | El recurso indicado no existe                                                | `ResourceNotFoundException`                                   |
| `409`    | `/problems/duplicated-resource` | Duplicated resource   | Ya existe un recurso con ese valor único                                     | `DuplicatedResourceException`                                 |
| `500`    | `/problems/internal-error`      | Internal server error | Error no controlado                                                          | *(no controlado en Java)*                                     |

**Regla de seguridad para `500`:** el campo `detail` debe ser un mensaje genérico. Nunca debe incluir mensajes internos,
SQL ni trazas de pila; esos datos van solo al log del servidor.

### 8.4 Comparación con la versión Java

| Aspecto                | Java (actual)                                                     | NestJS (contrato)                                          |
|------------------------|-------------------------------------------------------------------|------------------------------------------------------------|
| Formato                | `ApiError` propio: `timestamp`, `status`, `message`, `path`       | RFC 9457                                                   |
| Content-Type           | `application/json`                                                | `application/problem+json`                                 |
| `status`               | Nombre del enum (`"NOT_FOUND"`)                                   | Número (`404`)                                             |
| `timestamp`            | `LocalDateTime`, sin desplazamiento                               | Fecha-hora con desplazamiento                              |
| Errores de validación  | Objeto plano `{ "campo": "mensaje" }`, sin el resto de los campos | Mismo formato que cualquier error, más el arreglo `errors` |
| Errores no controlados | Formato por defecto de Spring                                     | `/problems/internal-error`                                 |

---

## 9. Observaciones para la migración

Comportamientos de la versión Java que **no deben replicarse**, o que requieren una decisión antes de implementarse.

### 9.1 Defectos a corregir

| #  | Dónde                   | Comportamiento en Java                                                                                                                                                                                                                                                                                                  | Comportamiento esperado                                                     |
|----|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| 1  | Autenticación           | Sin token, Spring Security responde `403` porque no hay un *entry point* configurado. Además, las excepciones de JWT (token vencido o mal firmado) se lanzan dentro del filtro, fuera del alcance de `@RestControllerAdvice`, por lo que no llegan al manejador de errores; y `SignatureException` está mapeada a `403` | `401 Unauthorized` en todos esos casos, con el formato de la sección 8      |
| 2  | Token JWT               | El vencimiento se calcula **una vez** al iniciar la aplicación (`ApiUtils.VALID_TOKEN_TIME` es una constante): todos los tokens vencen 1 hora después del arranque                                                                                                                                                      | Cada token vence 1 hora después de **emitido**                              |
| 3  | Registro                | La expresión regular de la contraseña incluye `/` literales (`"/(?=...).{8,}/"`), por lo que casi ninguna contraseña la cumple                                                                                                                                                                                          | Al menos una minúscula, una mayúscula y un dígito; entre 8 y 15 caracteres  |
| 4  | Listados                | El orden por defecto usa `root.get("ID")`, pero la propiedad se llama `id`                                                                                                                                                                                                                                              | Orden por defecto válido                                                    |
| 5  | `continentName`         | El filtro aplica `lower()` sobre la **relación** `continent`, no sobre su nombre                                                                                                                                                                                                                                        | Comparar contra el nombre del continente                                    |
| 6  | `PATCH` países e íconos | `population`, `area` y `height` solo se aplican si son **mayores que 1**, así que no se puede asignar el valor `1`. Además, al ser primitivos, un campo omitido llega como `0`                                                                                                                                          | Aplicar el valor si viene presente y es válido (≥ 1)                        |
| 7  | `PATCH` países          | Verifica duplicados con `existsByName(dto.name())` aun cuando `name` no viene, y rechaza actualizar un país manteniendo su propio nombre                                                                                                                                                                                | Verificar duplicados solo si cambia el nombre, y excluir el propio registro |
| 8  | `PATCH` continentes     | No valida que el nuevo nombre no esté repetido                                                                                                                                                                                                                                                                          | Responder `409` si el nombre ya existe en otro continente                   |
| 9  | Borrado lógico          | `CountryEntity` usa `@Table(name = "COUNTIES")` mientras `@SQLDelete` apunta a `COUNTRIES`, y `@SQLRestriction("deleted <> false")` muestra **solo** los borrados                                                                                                                                                       | Borrado lógico con `deleted_at`, excluyendo los borrados de los listados    |
| 10 | Validación              | `RestExceptionHandler` responde los errores de validación en un formato distinto al resto                                                                                                                                                                                                                               | Formato único (sección 8)                                                   |

### 9.2 Cambios de diseño recomendados

| #  | Tema                     | Situación actual                                                                                                                             | Recomendación                                                                                                                                |
|----|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | Filtros en `GET`         | `GET /countries` y `GET /icons` reciben los filtros en el **cuerpo**. Muchos clientes HTTP, proxies y cachés descartan el cuerpo de un `GET` | Recibir los filtros como *query params*: `GET /api/v1/countries?page=0&name=arg&continentName=amér&iconIds=…&sort=name`                      |
| 2  | Nombres de filtros       | `iconsNames` y `countries` contienen **ids**, no nombres                                                                                     | Renombrar a `iconIds` y `countryIds`                                                                                                         |
| 3  | `orderByField`           | Acepta cualquier propiedad de la entidad                                                                                                     | Lista blanca de campos ordenables (por ejemplo, `name`, `population`) y `400` para el resto                                                  |
| 4  | Parámetro de página      | Continentes usa `page`; países e íconos, `pageNumber`                                                                                        | Unificar en `page` (y opcionalmente `size`)                                                                                                  |
| 5  | Imágenes                 | Se recibe y devuelve `imageURL`                                                                                                              | El nuevo esquema guarda la clave del objeto en el bucket (`image_key`). Definir si la API devuelve una URL firmada o un endpoint de descarga |
| 6  | Autorización             | Cualquier usuario autenticado puede crear, modificar y borrar                                                                                | Con los roles del nuevo esquema: `VIEWER` solo lectura (`GET`), `ADMIN` lectura y escritura. Las escrituras sin permiso responden `403`      |
| 7  | Roles                    | Java usa `USER` y `ADMIN`; el registro asigna `USER`                                                                                         | El nuevo esquema usa `ADMIN` y `VIEWER`; el registro asigna `VIEWER`                                                                         |
| 8  | Unicidad de íconos       | Java rechaza íconos con nombre repetido, pero el nuevo esquema no tiene restricción `UNIQUE` en `icons.name`                                 | Decidir si se mantiene la regla; si es así, agregar el índice único en una migración                                                         |
| 9  | Relaciones en respuestas | Continentes devuelven los nombres de **todos** sus países; países e íconos, los nombres de sus relaciones                                    | Evaluar devolver `{ id, name }` en lugar de solo el nombre, para que el cliente pueda navegar al recurso                                     |
| 10 | Secreto JWT              | Está escrito en el código fuente                                                                                                             | Leerlo de una variable de entorno                                                                                                            |