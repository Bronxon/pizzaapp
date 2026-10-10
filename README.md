# 🍕 PizzApp — Hermosillo Pizza Finder

Guía comunitaria para **descubrir, calificar y ubicar las pizzerías de Hermosillo, Sonora**. Incluye mapa interactivo con navegación, buscador con sugerencias, reseñas con calificación de 1 a 5 estrellas, menús por pizzería, centro de ayuda y un panel de administración con permisos granulares.

PizzApp es una guía informativa: **no procesa pedidos ni pagos** ni cobra comisiones a los negocios.

| Plataforma | Cómo se distribuye |
|---|---|
| Web | Aplicación Next.js desplegada en Netlify: <https://pizzappoficial.netlify.app> |
| Escritorio (Windows) | Envoltorio Electron que carga el sitio web, con actualizaciones automáticas desde GitHub Releases |
| Móvil (Android) | Envoltorio Expo / React Native (WebView) que carga el sitio web |

---

## Contenido

- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Roles y permisos](#roles-y-permisos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Despliegue](#despliegue)
- [Servicios de terceros](#servicios-de-terceros)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Documentación adicional](#documentación-adicional)
- [Licencia](#licencia)

---

## Funcionalidades

**Para cualquier visitante (sin cuenta)**
- Mapa interactivo (MapLibre GL) centrado en Hermosillo, con capas de mapa, satélite, relieve y tráfico.
- Ubicación del usuario y rutas en coche hasta una pizzería, con instrucciones paso a paso.
- Buscador con sugerencias de pizzerías, tipos de pizza y zonas.
- Ficha de cada pizzería: dirección, horario, teléfono, sitio web, redes, menú y opiniones.
- Ranking de pizzerías destacadas, preguntas frecuentes, centro de ayuda y escena 3D de bienvenida.
- Asistente "Pizzi": chatbot con una base de conocimiento local (no requiere API de IA).

**Para usuarios registrados** (correo y contraseña, o Google)
- Publicar reseñas con calificación y borrar las propias.
- Dejar testimonios sobre la app.
- Perfil con foto (subida o avatar generado), cambio de contraseña y eliminación de cuenta.
- Mensajería de soporte con el equipo (`/contact` y `/messages`).

**Para administradores** (según sus permisos)
- Alta, edición y baja de pizzerías; importación masiva desde OpenStreetMap (Overpass).
- Gestión de menús, ranking y estilos del ranking.
- Moderación y respuesta de reseñas y testimonios.
- Edición de FAQ, centro de ayuda, footer, tarjetas "¿Por qué PizzApp?", términos y privacidad.
- Editor visual de diseño (tamaños y posiciones de elementos en escritorio y móvil).
- Bandeja de mensajes de soporte (`/admin/messages`).
- Superadministrador: concede o retira roles y permisos y ve usuarios en línea (`/admin/granting`).

## Tecnologías

| Área | Tecnología |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, Server Actions), React 18, TypeScript |
| UI | Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/) (Radix UI), lucide-react, Embla Carousel |
| Mapas | MapLibre GL, OSRM (rutas), Nominatim / HERE (geocodificación) |
| 3D | three.js, @react-three/fiber, @react-three/drei |
| Base de datos | PostgreSQL + [Prisma ORM 5](https://www.prisma.io/) |
| Autenticación | [Auth.js (NextAuth v5)](https://authjs.dev/): credenciales (bcrypt) y Google OAuth, sesiones JWT |
| IA (opcional) | [Genkit](https://firebase.google.com/docs/genkit) + Google Gemini (solo flujos de desarrollo) |
| Escritorio | Electron + electron-builder + electron-updater |
| Móvil | Expo + React Native WebView (EAS Build) |
| Hosting | Netlify (web) y Neon (PostgreSQL) |

## Requisitos

- **Node.js 20 o superior** (se recomienda 22 LTS) y npm.
- Una base de datos **PostgreSQL** (por ejemplo, un proyecto gratuito en [Neon](https://neon.tech/)).
- Opcional: credenciales OAuth de Google, clave de HERE y clave de Google AI.

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://github.com/UnnamedUser0/studio.git
cd studio

# 2. Instalar dependencias (el archivo .npmrc ya activa legacy-peer-deps)
npm install            # también ejecuta `prisma generate`

# 3. Configurar variables de entorno
cp .env.example .env   # y rellena DATABASE_URL, AUTH_SECRET y SUPER_ADMIN_EMAIL

# 4. Crear las tablas en la base de datos
npm run db:push

# 5. Crear la cuenta del superadministrador
SEED_ADMIN_PASSWORD="una-contraseña-segura" npm run db:seed

# 6. Iniciar el servidor de desarrollo
npm run dev
```

`npm run dev` levanta Next.js con HTTPS local (necesario para la geolocalización del navegador) en **<https://localhost:3000>** y abre el navegador cuando el servidor responde. La primera vez, Next.js genera un certificado autofirmado en `certificates/`.

> **Nota:** el pie de página consulta la base de datos en cada página, por lo que `npm run build` también necesita un `DATABASE_URL` válido y accesible.

Más detalles sobre la base de datos (Neon, PostgreSQL local, migración desde SQLite) en [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md).

## Variables de entorno

La plantilla completa está en [`.env.example`](.env.example).

| Variable | ¿Obligatoria? | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL usada por Prisma. |
| `AUTH_SECRET` | Sí | Firma de las sesiones de Auth.js. Genérala con `npx auth secret`. |
| `SUPER_ADMIN_EMAIL` | Sí | Correo de la cuenta con control total. Solo se lee en el servidor. |
| `SEED_ADMIN_PASSWORD` | Solo para la semilla | Contraseña inicial del superadmin si la cuenta no existe. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | Habilitan "Iniciar sesión con Google". |
| `GOOGLE_GENAI_API_KEY` | No | Flujos de Genkit (`npm run genkit:dev`). El chatbot de la web no la usa. |
| `HERE_API_KEY` / `NEXT_PUBLIC_HERE_API_KEY` | No | Geocodificación con HERE; sin ella se usa Nominatim. |
| `NOMINATIM_USER_AGENT` | No | User-Agent identificable para Nominatim. |
| `PIZZAPP_URL` | No | URL que abre la app de escritorio. |

En Netlify, define las mismas variables en *Site configuration → Environment variables* (`AUTH_TRUST_HOST=true` ya está en `netlify.toml`).

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HTTPS y apertura automática del navegador. |
| `npm run next:dev` | Solo el servidor de desarrollo de Next.js. |
| `npm run build` / `npm start` | Compilación y servidor de producción. |
| `npm run typecheck` | Verificación de tipos con TypeScript. |
| `npm run db:push` | Sincroniza `prisma/schema.prisma` con la base de datos. |
| `npm run db:seed` | Crea o promueve la cuenta del superadministrador. |
| `npm run db:studio` | Abre Prisma Studio en <http://localhost:5555>. |
| `npm run genkit:dev` | Interfaz de desarrollo de Genkit para probar los flujos de IA. |
| `npm run desktop:dev` | Abre la app de escritorio (Electron). |
| `npm run desktop:build` | Genera el instalador de Windows (`dist/`). |
| `npm run mobile` | Inicia Expo para la app móvil. |

## Roles y permisos

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| Invitado | Sin sesión | Explorar mapa, pizzerías, menús, opiniones, FAQ y ayuda. |
| Usuario | Registro con correo o Google | Reseñar, dar testimonios, gestionar su perfil y mensajes de soporte. |
| Administrador | `isAdmin = true` (lo asigna el superadmin) | Panel de admin y bandeja de soporte, más lo que permitan sus permisos. |
| Superadministrador | Su correo coincide con `SUPER_ADMIN_EMAIL` | Todos los permisos y la gestión de roles en `/admin/granting`. |

Permisos de administrador (`User.permissions`, separados por comas):

| Permiso | Habilita |
|---|---|
| `manage_pizzerias` | Pizzerías, menús, importadores, ranking y estilos del ranking. |
| `manage_reviews` | Responder y eliminar reseñas de cualquier usuario. |
| `manage_content` | Testimonios, FAQ, centro de ayuda, footer, "¿Por qué PizzApp?", términos y privacidad. |
| `manage_users`, `view_analytics` | Reservados (todavía no habilitan funciones). |

La interfaz oculta lo que el usuario no puede hacer, pero **la autorización real se hace en el servidor**: cada server action que modifica datos llama a `requireUser()`, `requireAdmin(permiso)` o `requireSuperAdmin()` (`src/lib/authz.ts`). El detalle está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Estructura del proyecto

```
.
├── src/
│   ├── app/                  # Rutas (App Router)
│   │   ├── page.tsx          # Inicio: mapa, ranking, explorar, testimonios
│   │   ├── actions.ts        # Server actions: pizzerías, reseñas, perfil, ajustes
│   │   ├── actions/          # Server actions por dominio (admin, contacto, FAQ, footer…)
│   │   ├── admin/            # Panel de admin, mensajes y otorgamiento de roles
│   │   ├── api/auth/         # Endpoints de Auth.js
│   │   ├── api/avatar/       # Sirve las fotos de perfil guardadas en la BD
│   │   └── about, contact, download, faq, help, login, messages, privacy, terms
│   ├── components/           # UI (shadcn/ui en components/ui) y componentes de dominio
│   ├── ai/                   # Genkit: configuración, flujos y herramientas
│   ├── lib/                  # auth, authz, permisos, Prisma, tipos, datos estáticos
│   ├── hooks/
│   └── types/                # Ampliación de tipos de Auth.js
├── prisma/                   # schema.prisma y seed.ts
├── public/                   # Iconos, cursores, modelo 3D y archivos subidos (legado)
├── scripts/                  # Utilidades (migración SQLite → PostgreSQL)
├── android/                  # Proyecto nativo de Android generado por Expo
├── App.js, index.js, app.json, eas.json   # App móvil (Expo)
├── electron-main.js, update.html          # App de escritorio (Electron)
└── docs/                     # Documentación del proyecto
```

## Despliegue

### Web (Netlify)
1. Conecta el repositorio en Netlify. `netlify.toml` ya define `npm run build`.
2. Configura las variables de entorno (ver tabla) y que `DATABASE_URL` apunte a la base de producción.
3. En Google Cloud, añade `https://TU-DOMINIO/api/auth/callback/google` como URI de redirección.
4. Aplica cambios del esquema antes de desplegar: `npm run db:push` contra la base de producción.

### Escritorio (Windows)
`npm run desktop:build` genera el instalador NSIS en `dist/`. La configuración `build.publish` de `package.json` publica en los Releases de `UnnamedUser0/studio`, y `electron-updater` busca actualizaciones al abrir la app. La ventana carga la URL de producción (o `PIZZAPP_URL`).

### Móvil (Android)
La app (`App.js`) es una WebView del sitio de producción. Para generar un APK: `npx eas build -p android --profile preview` (requiere cuenta de Expo). La versión se define en `app.json` y en `android/app/build.gradle`.

## Servicios de terceros

La app se apoya en servicios externos con condiciones de uso propias. Antes de un uso público o comercial, revísalas (detalle en [`docs/CUMPLIMIENTO.md`](docs/CUMPLIMIENTO.md)):

| Servicio | Uso en PizzApp |
|---|---|
| Teselas de Google Maps (`mt*.google.com`) | Capas base del mapa |
| OSRM (`router.project-osrm.org`) | Cálculo de rutas (recibe la ubicación del usuario) |
| Nominatim / Overpass (OpenStreetMap) | Geocodificación e importación de pizzerías |
| HERE | Geocodificación en el flujo de Genkit (opcional) |
| DiceBear, avatar.iran.liara.run | Avatares generados a partir del nombre |
| Google OAuth, Google AI (Gemini) | Inicio de sesión y flujos de IA (opcionales) |
| Neon, Netlify | Base de datos y hosting |

## Limitaciones conocidas

- **Imágenes en la base de datos:** las fotos (perfil, pizzerías, menús, soporte) se guardan como Base64 en PostgreSQL. Es simple y compatible con Netlify, pero hace crecer la BD y las respuestas; a futuro conviene un almacenamiento de objetos (S3, Cloudinary, Netlify Blobs).
- **Sin historial de migraciones:** el esquema se sincroniza con `prisma db push`. Ver cómo crear una línea base en [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md).
- **Sin pruebas automatizadas ni ESLint configurado.** `npm run typecheck` es la verificación disponible.
- **Pizzerías de dos fuentes:** el listado combina `src/lib/pizzerias-data.ts` (datos estáticos de OSM) con la tabla `Pizzeria`; una pizzería estática se copia a la BD al recibir su primera reseña.
- **Archivos heredados en `public/uploads/`:** son de la versión anterior que guardaba imágenes en disco. Algunos registros antiguos pueden seguir apuntando a ellos; revisa su contenido y derechos antes de publicarlos.
- `src/components/map/here-map.tsx` y `src/components/admin/here-importer.tsx` no están conectados a ninguna página.

## Documentación adicional

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): flujo de datos, autenticación, autorización y modelo de datos.
- [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md): configuración de PostgreSQL, semilla y migración desde SQLite.
- [`docs/CUMPLIMIENTO.md`](docs/CUMPLIMIENTO.md): datos personales, licencias y riesgos legales pendientes.
- [`SECURITY.md`](SECURITY.md): cómo reportar vulnerabilidades y buenas prácticas.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): cómo contribuir.
- [`CHANGELOG.md`](CHANGELOG.md): historial de cambios.
- [`docs/blueprint.md`](docs/blueprint.md): brief de diseño original.

## Licencia

**Pendiente de definir.** Mientras el repositorio no incluya un archivo `LICENSE`, el código queda con todos los derechos reservados por sus autores y nadie más puede reutilizarlo legalmente. Si quieres que sea código abierto, elige una licencia (por ejemplo MIT o Apache-2.0) en <https://choosealicense.com/> y agrega el archivo `LICENSE`. Las marcas, logotipos e imágenes de terceros (logos de pizzerías, modelo 3D, imágenes de perfil) **no** quedan cubiertos por la licencia del código.
