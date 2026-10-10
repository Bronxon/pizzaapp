# Base de datos

PizzApp usa **PostgreSQL** a través de **Prisma ORM 5**. El esquema completo está en [`prisma/schema.prisma`](../prisma/schema.prisma).

> Este documento sustituye a la antigua guía `DATABASE_SETUP.md`, que describía una base MySQL/XAMPP con tablas `users`, `pizzerias` y `reviews`. Esa configuración **no** corresponde a la aplicación actual.

## 1. Crear la base de datos

### Opción A: Neon (recomendada, la que se usa en producción)
1. Crea un proyecto en <https://neon.tech/>.
2. Copia la *connection string* (incluye `?sslmode=require`).
3. Pégala en `.env` como `DATABASE_URL`.

### Opción B: PostgreSQL local con Docker
```bash
docker run --name pizzapp-db -e POSTGRES_PASSWORD=pizzapp -e POSTGRES_DB=pizzapp -p 5432:5432 -d postgres:16
```
```env
DATABASE_URL="postgresql://postgres:pizzapp@localhost:5432/pizzapp"
```

## 2. Crear las tablas

```bash
npm run db:push
```

`prisma db push` compara el esquema con la base y crea o modifica las tablas. Úsalo también cada vez que cambies `schema.prisma`.

> ⚠️ `db push` puede pedir confirmación si un cambio borra datos (por ejemplo, eliminar una columna). Haz un respaldo de la base de producción antes de aplicarlo.

## 3. Crear el superadministrador

```bash
SEED_ADMIN_PASSWORD="una-contraseña-segura" npm run db:seed
```

- Usa el correo de `SUPER_ADMIN_EMAIL`.
- Si la cuenta no existe, la crea con esa contraseña (mínimo 8 caracteres).
- Si ya existe (por ejemplo, te registraste con Google), solo le asigna rol de administrador y todos los permisos; **no cambia su contraseña**.

El contenido editable (FAQ, footer, centro de ayuda, términos) se crea desde la propia interfaz de administración. El footer tiene un botón para cargar valores por defecto.

## 4. Explorar los datos

```bash
npm run db:studio   # http://localhost:5555
```

## Modelo de datos

| Modelo | Descripción |
|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | Usuarios y tablas estándar de Auth.js. `User` añade `password` (hash bcrypt), `isAdmin`, `permissions` y `lastActiveAt`. |
| `Pizzeria`, `MenuItem` | Pizzerías y productos de su menú. |
| `Review` | Reseñas (1–5 estrellas) con respuesta opcional del administrador. |
| `Testimonial` | Testimonios generales sobre la app. |
| `ContactMessage`, `ContactReply` | Conversaciones de soporte entre usuarios y administradores. |
| `FaqCategory`, `FaqQuestion`, `HelpCenterCard`, `FeatureCard` | Contenido editable de FAQ, ayuda y "¿Por qué PizzApp?". |
| `FooterSection`, `FooterLink`, `SocialLink`, `FooterConfig` | Contenido del pie de página. |
| `AboutContent` | Textos de términos, privacidad, versión y copyright. |
| `GlobalSettings` | Pares clave/valor JSON: `layout_settings`, `ranking`, `ranking_styles`. |

## Historial de migraciones (opcional)

El repositorio ya no incluye la carpeta `prisma/migrations`: la que existía se había generado para **SQLite** y era incompatible con el proveedor `postgresql` del esquema (Prisma rechaza ejecutar migraciones de otro proveedor). La base de producción se creó con `db push`.

Si quieres pasar a migraciones versionadas sin perder datos:

```bash
# 1. Genera la migración inicial a partir del esquema actual
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

# 2. Márcala como ya aplicada en la base existente
npx prisma migrate resolve --applied 0_init

# 3. A partir de aquí, usa migraciones para cada cambio
npx prisma migrate dev --name descripcion_del_cambio   # desarrollo
npx prisma migrate deploy                              # producción
```

Más información: <https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining>.

## Migrar datos desde la antigua base SQLite

Las primeras versiones usaban un archivo `prisma/dev.db` (SQLite). Para copiar esos datos a PostgreSQL:

```bash
npm run db:push                                              # el esquema debe existir
node scripts/migrate-sqlite-to-postgres.js ./ruta/dev.db --yes
```

> ⚠️ El script **borra** los datos actuales de las tablas de PostgreSQL antes de copiar. Requiere Node.js 22.5 o superior (módulo `node:sqlite`).

El archivo `dev.db` **no debe subirse a GitHub**: contiene correos y hashes de contraseñas. Está excluido en `.gitignore`.
