# API.md — Catálogo de endpoints de icons-lab

**Este documento es el contrato de la API de icons-lab.** Define qué rutas existen, qué reciben, qué devuelven y con qué
reglas. La implementación se ajusta a él, no al revés.

- **Versión:** v1
- **Base URL local:** `http://localhost:8080/api/v1`
- **Base URL staging:** `[a definir]`
- **Especificación viva:** `http://localhost:8080/api/docs-json` · UI: `http://localhost:8080/api/docs`

> Este archivo es el **acuerdo**; el OpenAPI generado desde el código es la **implementación**. Cuando difieran, el
> código está mal o este documento no se actualizó: ambas cosas son un bug.

---

## Cómo cambiar este contrato

1. Modifica **primero** este archivo, en un cambio que no toque código.
2. Actualiza la tabla de **Estado de implementación** si el cambio agrega o quita endpoints.
3. Recién entonces implementa.

**Cambios que rompen (necesitan versión nueva o aviso explícito):** quitar un campo, renombrarlo, cambiar su tipo,
volver obligatorio un campo opcional, cambiar un código de estado. **Cambios que no rompen:** agregar un campo opcional
en la respuesta, agregar un endpoint nuevo.

---

## Convenciones generales

| Aspecto             | Regla                                                                                                                                                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Formato             | JSON. `Content-Type: application/json; charset=utf-8`. Excepción: subida de imágenes, `multipart/form-data`                                                                                                   |
| Nombres             | `camelCase` en JSON                                                                                                                                                                                           |
| Fecha y hora        | ISO-8601 **con desplazamiento** (RFC 3339). El servidor responde siempre en UTC: `2026-10-17T14:52:00Z`. Acepta cualquier desplazamiento (`2026-10-17T11:52:00-03:00`) y rechaza con `400` los valores sin él |
| Fechas sin hora     | `YYYY-MM-DD`: `1934-10-09`                                                                                                                                                                                    |
| Identificadores     | UUID como string, generados por el servidor                                                                                                                                                                   |
| Números             | Números JSON. Enteros hasta 2⁵³ − 1                                                                                                                                                                           |
| Textos              | Se guardan sin espacios al inicio y al final. Un texto obligatorio que queda vacío después de recortarlo es inválido                                                                                          |
| Nulos               | `null` explícito. Nunca se omite el campo ni se usa `""`                                                                                                                                                      |
| Campos desconocidos | Un campo que el endpoint no define responde `400`                                                                                                                                                             |
| Creación            | Todo `POST` que crea un recurso responde `201` con el recurso completo y el header `Location`                                                                                                                 |
| Actualización       | `PATCH` parcial (ver [Semántica de `PATCH`](#semántica-de-patch)). Responde `200` con el recurso completo                                                                                                     |
| Borrado             | `DELETE` responde `204` sin cuerpo. Países e íconos: borrado lógico                                                                                                                                           |
| Imágenes            | Sub-recurso `PUT /{recurso}/{id}/image` (ver [Imágenes](#imágenes))                                                                                                                                           |
| Listados            | Query params `page`, `size`, `sort` y filtros (ver [Listados paginados](#listados-paginados))                                                                                                                 |
| Autenticación       | `Authorization: Bearer <token>`, obtenido en `POST /auth/login`. Vence 1 hora después de emitido                                                                                                              |
| Autorización        | Roles `ADMIN` y `VIEWER` (ver [Roles](#roles))                                                                                                                                                                |

### Roles

| Rol      | Puede                                                    |
|----------|----------------------------------------------------------|
| `VIEWER` | Todos los `GET`                                          |
| `ADMIN`  | Todo: además, crear, modificar, borrar y cargar imágenes |

Todo usuario registrado por `POST /auth/register` es `VIEWER`. No hay endpoint para cambiar el rol: los `ADMIN` se
asignan directamente en la base.

### Semántica de `PATCH`

- Solo se modifican los campos **presentes** en el cuerpo; los ausentes quedan como están.
- Un campo presente se valida igual que en el `POST` correspondiente.
- Enviar `null` en un campo **obligatorio** responde `400`. Enviar `null` en un campo **opcional** lo vacía.
- Las reglas de unicidad se verifican solo si el valor cambia, excluyendo al propio recurso: enviar el mismo nombre que
  ya tiene no es un conflicto.
- Un cuerpo vacío `{}` no modifica nada y responde `200`.

### Listados paginados

Aplican a `GET /countries` y `GET /icons`. Todos los parámetros son opcionales y viajan como *query params*; los `GET`no
llevan cuerpo.

| Param   | Regla                                                                                                                                                                                                                         |
|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `page`  | Entero ≥ 0, base 0. Por defecto `0`                                                                                                                                                                                           |
| `size`  | Entero entre 1 y 50. Por defecto `10`                                                                                                                                                                                         |
| `sort`  | `campo,dirección`, con **un solo** campo, elegido de la lista de cada endpoint. Dirección `asc` o `desc`. Por defecto `name,asc`. El servidor agrega siempre `id` como desempate, para que el orden entre páginas sea estable |
| Filtros | Se filtra por **id** de la relación, nunca por su nombre. Un filtro con varios valores **repite el parámetro**: `?iconId=X&iconId=Y` (no se usan listas separadas por coma)                                                   |

- Filtros distintos se combinan con **Y**; los valores repetidos de un mismo filtro, con **O**.
- Un parámetro desconocido o un valor inválido responde `400` con el detalle en `errors`.
- Una página sin resultados (o fuera de rango) responde `200` con `content: []`, nunca `404`.

**Forma de la respuesta**

```json
{
  "content": [
    {
      "...": "elementos del recurso"
    }
  ],
  "page": {
    "number": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### Imágenes

Continentes, países e íconos se crean **sin imagen**. La imagen se carga después con `PUT /{recurso}/{id}/image`, en un
solo paso:

- `multipart/form-data`, campo `file`. JPEG, PNG o WebP; máximo 5 MB.
- En esa misma petición el servidor valida el archivo, lo sube al bucket, lo asocia al recurso y responde `200` con el
  recurso completo, ya con su `imageURL`.
- Una imagen asignada se puede **reemplazar** con otro `PUT`, pero **no eliminar**: no existe
  `DELETE /{recurso}/{id}/image`. Un recurso tiene `imageURL: null` solo mientras no se le cargó ninguna.
- `imageURL` es una URL pública, sin firma ni vencimiento. El cliente la usa tal cual y no debe armarla ni
  interpretarla.
- Cada imagen nueva tiene una URL distinta de la anterior, así que los navegadores y la CDN nunca muestran una versión
  vieja en caché.

**Errores:** `400` falta el campo `file` · `413` el archivo supera 5 MB · `415` el tipo no es JPEG, PNG ni WebP.

> **Implementación.** La base guarda solo la **clave** del objeto (`image_key`), nunca la URL. La clave la genera el
> servidor con el formato `{recurso}/{id}/{versión}.{extensión}`, donde la versión es un valor aleatorio nuevo en cada
> subida (por ejemplo, `continents/3f2b8c1e-…/7c1e9a.webp`). `imageURL` se arma al responder: URL pública base (variable
> de entorno) + clave. Al reemplazar, primero se guarda la clave nueva y después se borra del bucket el archivo anterior.

### Formato de error (RFC 9457, uniforme en toda la API)

`Content-Type: application/problem+json`.

```json
{
  "type": "/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request contains 2 invalid fields.",
  "instance": "/api/v1/countries",
  "timestamp": "2026-10-17T14:52:00.123Z",
  "errors": [
    {
      "field": "name",
      "message": "name should not be empty"
    },
    {
      "field": "population",
      "message": "population must not be less than 0"
    }
  ]
}
```

- `type` es estable y es lo que el cliente debe evaluar; `title` y `detail` son legibles y pueden cambiar.
- `timestamp` es el instante del error, en UTC.
- `errors` aparece solo en errores de validación (`400`), con un elemento por campo o parámetro.
- En un `500`, `detail` es siempre genérico: nunca incluye mensajes internos, SQL ni trazas.

| `type`                          | `status` | Cuándo                                                        |
|---------------------------------|----------|---------------------------------------------------------------|
| `/problems/validation-error`    | `400`    | Cuerpo, query params o campos inválidos o desconocidos        |
| `/problems/malformed-request`   | `400`    | JSON mal formado o cuerpo ausente                             |
| `/problems/invalid-identifier`  | `400`    | Un `{id}` de la ruta no es un UUID válido                     |
| `/problems/unauthorized`        | `401`    | Sin token, token inválido o vencido, credenciales incorrectas |
| `/problems/forbidden`           | `403`    | Usuario deshabilitado o sin el rol requerido                  |
| `/problems/resource-not-found`  | `404`    | El recurso no existe (o fue borrado)                          |
| `/problems/duplicated-resource` | `409`    | Ya existe un recurso con ese valor único                      |
| `/problems/payload-too-large`   | `413`    | La imagen supera el tamaño máximo                             |
| `/problems/unsupported-media`   | `415`    | La imagen no es de un tipo admitido                           |
| `/problems/internal-error`      | `500`    | Error no controlado                                           |

### Códigos de estado usados

`200` OK · `201` Creado · `204` Sin contenido · `400` Entrada inválida · `401` Sin autenticar · `403` Sin permiso ·`404`
No existe · `409` Conflicto · `413` Archivo demasiado grande · `415` Tipo de archivo no admitido · `500` Error del
servidor · `503` Servicio no disponible (solo `/health`).

### Errores comunes

No se repiten en cada endpoint:

- Toda ruta 🔒: `401` sin token, token inválido o vencido · `403` usuario deshabilitado.
- Toda ruta 🔒 **ADMIN**: además, `403` si el usuario es `VIEWER`.
- Toda ruta con `{id}`: `400` si no es un UUID válido · `404` si no existe o fue borrado.
- Todo endpoint con cuerpo: `400` si el JSON está mal formado o trae campos desconocidos.

---

## 1. Autenticación — `/auth`

### `POST /auth/register`

Registra un usuario. Público. Se crea con rol `VIEWER` y habilitado.

**Request**

```json
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "Ana.Perez@mail.com",
  "password": "Secreta123"
}
```

`firstName`, `lastName`: obligatorios, máximo 80 caracteres.
`email`: obligatorio, formato válido, máximo 254 caracteres. Se guarda en minúsculas y es único sin distinguir
mayúsculas.
`password`: obligatoria, entre 8 y 15 caracteres, con al menos una minúscula, una mayúscula y un dígito.

**Response `201`** (sin header `Location`: no existe un endpoint para consultar usuarios)

```json
{
  "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "ana.perez@mail.com",
  "role": "VIEWER",
  "enabled": true
}
```

> La contraseña **nunca** viaja en una respuesta.

**Errores:** `400` validación · `409` el email ya está registrado.

### `POST /auth/login`

Canjea credenciales por un token de acceso. Público.

**Request**

```json
{
  "email": "ana.perez@mail.com",
  "password": "Secreta123"
}
```

`email`, `password`: obligatorios. El email no distingue mayúsculas.

**Response `200`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjMWQyZTNmNC...",
  "expiresAt": "2026-10-17T15:52:00Z"
}
```

> No crea un recurso persistente: por eso responde `200` y no `201`. `expiresAt` le dice al cliente cuándo pedir un
> token nuevo sin tener que decodificar el JWT.

**Errores:** `400` validación · `401` email o contraseña incorrectos (la respuesta es la misma en ambos casos: no se
revela si el email existe) · `403` usuario deshabilitado.

---

## 2. Continentes — `/continents` 🔒

Dos representaciones: el listado devuelve la **resumida**, sin países; el resto de los endpoints, la **detallada**, con
los nombres de sus países activos ordenados alfabéticamente.

### `GET /continents` 🔒

Todos los continentes, **sin paginación**, ordenados por nombre. Sin continentes devuelve `[]`, no `404`.

> Son pocos y casi no cambian: paginar no aporta nada, y omitir los países mantiene liviano el listado.

**Response `200`**

```json
[
  {
    "id": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44",
    "imageURL": "https://cdn.icons-lab.example/continents/3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44/7c1e9a.webp",
    "name": "América"
  },
  {
    "id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    "imageURL": null,
    "name": "Europa"
  }
]
```

### `GET /continents/{id}` 🔒

Representación detallada.

**Response `200`**

```json
{
  "id": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44",
  "imageURL": "https://cdn.icons-lab.example/continents/3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44/7c1e9a.webp",
  "name": "América",
  "countries": [
    "Argentina",
    "Brasil",
    "Chile"
  ]
}
```

### `POST /continents` 🔒 ADMIN

Crea un continente sin imagen.

**Request**

```json
{
  "name": "América"
}
```

`name`: obligatorio, máximo 60 caracteres, único.

**Response `201`** (header `Location: /api/v1/continents/{id}`)

```json
{
  "id": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44",
  "imageURL": null,
  "name": "América",
  "countries": []
}
```

**Errores:** `400` validación · `409` ya existe un continente con ese nombre.

### `PATCH /continents/{id}` 🔒 ADMIN

Mismos campos y reglas que `POST /continents`.

**Request**

```json
{
  "name": "América del Sur"
}
```

**Response `200`** — el continente detallado, como en `GET /continents/{id}`. **Errores:** `400` validación · `409` ya
existe otro continente con ese nombre.

### `PUT /continents/{id}/image` 🔒 ADMIN

Sube o reemplaza la imagen (ver [Imágenes](#imágenes)).

**Request** — `multipart/form-data`, campo `file`.

**Response `200`**

```json
{
  "id": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44",
  "imageURL": "https://cdn.icons-lab.example/continents/3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44/7c1e9a.webp",
  "name": "América",
  "countries": [
    "Argentina",
    "Brasil",
    "Chile"
  ]
}
```

**Errores:** `400` falta el campo `file` · `413` supera 5 MB · `415` tipo no admitido.

> No hay endpoint para eliminar continentes.

---

## 3. Países — `/countries` 🔒

### `GET /countries` 🔒

Listado paginado y filtrable (ver [Listados paginados](#listados-paginados)). Los países borrados no se incluyen.

**Query params**

| Param          | Tipo             | Comportamiento                                                |
|----------------|------------------|---------------------------------------------------------------|
| `page`, `size` | `integer`        | Paginación                                                    |
| `sort`         | `string`         | Campos: `name`, `population` o `area`. Por defecto `name,asc` |
| `name`         | `string`         | Coincidencia parcial, sin distinguir mayúsculas               |
| `continentId`  | UUID             | Países de ese continente                                      |
| `iconId`       | UUID (repetible) | Países que tengan **alguno** de los íconos indicados          |

Ejemplo: `GET /countries?size=20&sort=population,desc&continentId=3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44`

**Response `200`**

```json
{
  "content": [
    {
      "id": "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b",
      "imageURL": "https://cdn.icons-lab.example/countries/8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b/4d2b8f.webp",
      "name": "Argentina",
      "population": 46000000,
      "area": 2780400.0,
      "continent": "América",
      "icons": [
        "Cataratas del Iguazú",
        "Obelisco"
      ]
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

`continent`: nombre del continente. `icons`: nombres de sus íconos activos, ordenados alfabéticamente.

**Errores:** `400` parámetros inválidos o desconocidos (por ejemplo, `sort=id,asc`, `size=100` o `?nmae=arg`).

### `GET /countries/{id}` 🔒

**Response `200`** — un país, con la misma forma que cada elemento de `content`.

### `POST /countries` 🔒 ADMIN

Crea un país sin imagen.

**Request**

```json
{
  "name": "Argentina",
  "population": 46000000,
  "area": 2780400.0,
  "continentId": "3f2b8c1e-9d4a-4c6b-8f0e-2a7d5b1c9e44"
}
```

`name`: obligatorio, máximo 100 caracteres, único entre los países activos (un país borrado no impide crear otro con el
mismo nombre).
`population`: obligatorio, entero ≥ 0.
`area`: obligatorio, número > 0, en km².
`continentId`: obligatorio; el continente debe existir.

**Response `201`** (header `Location: /api/v1/countries/{id}`)

```json
{
  "id": "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b",
  "imageURL": null,
  "name": "Argentina",
  "population": 46000000,
  "area": 2780400.0,
  "continent": "América",
  "icons": []
}
```

**Errores:** `400` validación · `404` el continente no existe · `409` ya existe un país activo con ese nombre.

### `PATCH /countries/{id}` 🔒 ADMIN

Cualquier subconjunto de los campos de `POST /countries`, con las mismas reglas. Todos son obligatorios: ninguno acepta
`null`.

**Request**

```json
{
  "population": 46500000
}
```

**Response `200`** — el país completo actualizado. **Errores:** `400` validación · `404` el continente indicado no
existe · `409` ya existe otro país activo con ese nombre.

### `DELETE /countries/{id}` 🔒 ADMIN

Borrado lógico: el país deja de aparecer en listados, en consultas y en el campo `countries` de continentes e íconos.
Los íconos asociados no se borran.

**Response `204`** — sin cuerpo.

### `PUT /countries/{id}/image` 🔒 ADMIN

Sube o reemplaza la imagen (ver [Imágenes](#imágenes)).

**Request** — `multipart/form-data`, campo `file`. **Response `200`** — el país completo, con su `imageURL`.
**Errores:** `400` falta el campo `file` · `413` supera 5 MB · `415` tipo no admitido.

---

## 4. Íconos — `/icons` 🔒

Un ícono es un monumento o lugar emblemático. Puede pertenecer a varios países (por ejemplo, las Cataratas del Iguazú, a
Argentina y Brasil).

### `GET /icons` 🔒

Listado paginado y filtrable (ver [Listados paginados](#listados-paginados)). Los íconos borrados no se incluyen.

**Query params**

| Param          | Tipo             | Comportamiento                                                                                                                        |
|----------------|------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| `page`, `size` | `integer`        | Paginación                                                                                                                            |
| `sort`         | `string`         | Campos: `name`, `creationDate` o `height`. Por defecto `name,asc`. Los íconos sin `creationDate` van al final, en cualquier dirección |
| `name`         | `string`         | Coincidencia parcial, sin distinguir mayúsculas                                                                                       |
| `creationDate` | fecha            | Coincidencia exacta: `1934-10-09`                                                                                                     |
| `countryId`    | UUID (repetible) | Íconos que pertenezcan a **alguno** de los países indicados                                                                           |

Ejemplo:
`GET /icons?countryId=8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b&countryId=9b2e3f4d-5c6f-4a71-8b8c-9d0e1f2a3b4c&sort=height,desc`

**Response `200`**

```json
{
  "content": [
    {
      "id": "b7c8d9e0-1f2a-4b3c-8d4e-5f6a7b8c9d0e",
      "imageURL": "https://cdn.icons-lab.example/icons/b7c8d9e0-1f2a-4b3c-8d4e-5f6a7b8c9d0e/9e3a1c.webp",
      "name": "Cataratas del Iguazú",
      "creationDate": "1934-10-09",
      "height": 82,
      "historyDescription": "Sistema de 275 saltos sobre el río Iguazú.",
      "countries": [
        "Argentina",
        "Brasil"
      ]
    }
  ],
  "page": {
    "number": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

`countries`: nombres de sus países activos, ordenados alfabéticamente.

**Errores:** `400` parámetros inválidos o desconocidos.

### `GET /icons/{id}` 🔒

**Response `200`** — un ícono, con la misma forma que cada elemento de `content`.

### `POST /icons` 🔒 ADMIN

Crea un ícono sin imagen.

**Request**

```json
{
  "name": "Cataratas del Iguazú",
  "creationDate": "1934-10-09",
  "height": 82,
  "historyDescription": "Sistema de 275 saltos sobre el río Iguazú.",
  "countryIds": [
    "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b",
    "9b2e3f4d-5c6f-4a71-8b8c-9d0e1f2a3b4c"
  ]
}
```

`name`: obligatorio, máximo 120 caracteres. **No** es único: puede haber dos íconos con el mismo nombre en países
distintos.
`creationDate`: opcional, fecha válida o `null`.
`height`: obligatorio, entero ≥ 1, en metros.
`historyDescription`: opcional, texto o `null`.
`countryIds`: obligatorio, al menos uno, sin repetidos; cada país debe existir y estar activo.

**Response `201`** (header `Location: /api/v1/icons/{id}`)

```json
{
  "id": "b7c8d9e0-1f2a-4b3c-8d4e-5f6a7b8c9d0e",
  "imageURL": null,
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

**Errores:** `400` validación · `404` algún país no existe.

### `PATCH /icons/{id}` 🔒 ADMIN

Cualquier subconjunto de los campos de `POST /icons`, con las mismas reglas. `creationDate` e `historyDescription`
aceptan `null` para vaciarlos.

Si viene `countryIds`, **reemplaza** la lista completa de países del ícono: para agregar uno, se envía la lista actual
más el nuevo; para quitarlo, la lista sin él. Nunca puede quedar vacía.

**Request**

```json
{
  "historyDescription": null,
  "countryIds": [
    "8a1d2f3c-4b5e-4f60-9a7b-8c9d0e1f2a3b"
  ]
}
```

**Response `200`** — el ícono completo actualizado. **Errores:** `400` validación · `404` algún país no existe.

### `DELETE /icons/{id}` 🔒 ADMIN

Borrado lógico: el ícono deja de aparecer en listados, en consultas y en el campo `icons` de los países.

**Response `204`** — sin cuerpo.

### `PUT /icons/{id}/image` 🔒 ADMIN

Sube o reemplaza la imagen (ver [Imágenes](#imágenes)).

**Request** — `multipart/form-data`, campo `file`. **Response `200`** — el ícono completo, con su `imageURL`.
**Errores:** `400` falta el campo `file` · `413` supera 5 MB · `415` tipo no admitido.

---

## 5. Operación

Fuera del prefijo `/api/v1`.

| Método | Ruta             | Descripción                                                 |
|--------|------------------|-------------------------------------------------------------|
| `GET`  | `/health`        | Healthcheck. Público. Lo usan Docker y el monitor de uptime |
| `GET`  | `/api/docs`      | Swagger UI                                                  |
| `GET`  | `/api/docs-json` | OpenAPI generado                                            |

### `GET /health`

Verifica que la API responde y que llega a la base de datos.

**Response `200`**

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

**Response `503`** — la API responde, pero no llega a la base de datos.

```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down"
    }
  },
  "details": {
    "database": {
      "status": "down"
    }
  }
}
```

> Es el formato de `@nestjs/terminus`. No expone datos de infraestructura (host, usuario, versión del motor): esos
> quedan en el log del servidor.

---

## 6. Estado de implementación

| Endpoint                                                               | Estado |
|------------------------------------------------------------------------|--------|
| `POST /auth/register` · `POST /auth/login`                             | ☐     |
| `GET /continents` · `GET /continents/{id}`                             | ☐     |
| `POST /continents` · `PATCH /continents/{id}`                          | ☐     |
| `PUT /continents/{id}/image`                                           | ☐     |
| `GET /countries` · `GET /countries/{id}`                               | ☐     |
| `POST /countries` · `PATCH /countries/{id}` · `DELETE /countries/{id}` | ☐     |
| `PUT /countries/{id}/image`                                            | ☐     |
| `GET /icons` · `GET /icons/{id}`                                       | ☐     |
| `POST /icons` · `PATCH /icons/{id}` · `DELETE /icons/{id}`             | ☐     |
| `PUT /icons/{id}/image`                                                | ☐     |
| `GET /health`                                                          | ☐     |

🔒 = requiere autenticación · 🔒 ADMIN = requiere rol `ADMIN`