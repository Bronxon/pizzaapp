# Arquitectura

## Visión general

```
 Navegador / Electron / WebView de Android
                 │
                 ▼
     Next.js 15 (App Router) en Netlify
     ├── Páginas y componentes React (cliente)
     ├── Server Actions  ──►  src/lib/authz.ts (sesión y permisos)
     ├── /api/auth/*     ──►  Auth.js (credenciales + Google)
     └── /api/avatar/:id ──►  fotos de perfil guardadas en la BD
                 │
                 ▼
         Prisma ORM ──► PostgreSQL (Neon)

 Servicios externos desde el navegador: teselas de Google Maps, OSRM (rutas),
 Overpass (importador), DiceBear / liara (avatares).
```

Las apps de escritorio y móvil **no** tienen lógica propia: cargan el sitio de producción (`https://pizzappoficial.netlify.app`).

## Lectura y escritura de datos

- Los componentes de cliente llaman directamente a **Server Actions** (`src/app/actions.ts` y `src/app/actions/*.ts`).
- Las acciones de lectura públicas (pizzerías, reseñas, FAQ, footer, ajustes de diseño) no requieren sesión.
- Toda acción que **modifica** datos o lee información privada valida la sesión y el permiso en el servidor.

> Cada función exportada de un archivo `'use server'` es un endpoint HTTP que cualquiera puede invocar. Ocultar un botón en la interfaz no protege nada: la verificación debe estar dentro de la acción.

## Autenticación (`src/lib/auth.ts`)

- **Auth.js v5** con `PrismaAdapter` y estrategia de sesión **JWT**.
- Proveedores: **Credenciales** (correo + contraseña con bcrypt) y **Google**.
- El callback `jwt` relee al usuario de la BD en cada petición, así que los cambios de rol y permisos se aplican sin cerrar sesión. Expone en la sesión: `id`, `isAdmin`, `isSuperAdmin` y `permissions`.
- Si la foto de perfil está guardada como data URL (Base64), la sesión solo lleva la URL `/api/avatar/<id>?v=<fecha>`, para que la cookie no crezca cientos de KB.
- `allowDangerousEmailAccountLinking: true` permite que alguien registrado con correo y contraseña entre luego con Google usando el mismo correo. Es cómodo, pero confía en que Google verificó el correo.

## Autorización

| Archivo | Responsabilidad |
|---|---|
| `src/lib/permissions.ts` | Constantes `PERMISSIONS` y `hasPermission()`, usados en cliente y servidor. |
| `src/lib/super-admin.ts` | `isSuperAdminEmail()`: compara con `SUPER_ADMIN_EMAIL` (solo servidor). |
| `src/lib/authz.ts` | `getCurrentUser()`, `requireUser()`, `requireAdmin(permiso?)`, `requireSuperAdmin()`. |

Reglas:
- **Superadmin:** su correo coincide con `SUPER_ADMIN_EMAIL`. Tiene todos los permisos. No puede quitarse su propio rol ni borrarse desde `/admin/granting`.
- **Admin:** `isAdmin = true`. Necesita el permiso concreto para cada área (`manage_pizzerias`, `manage_reviews`, `manage_content`). Sin permisos, solo accede al panel, al editor de diseño y a la bandeja de soporte.
- **Usuario:** solo puede modificar sus propios datos (perfil, contraseña, cuenta, reseñas y mensajes).

| Acción | Requisito |
|---|---|
| Pizzerías, menús, ranking, estilos de ranking | `manage_pizzerias` |
| Responder reseñas | `manage_reviews` |
| Borrar reseñas | Autor de la reseña o `manage_reviews` |
| Testimonios (moderar), FAQ, ayuda, footer, términos, tarjetas de características | `manage_content` |
| Editor de diseño (`layout_settings`), bandeja de soporte | Cualquier admin |
| Roles y permisos de otros usuarios | Superadmin |
| Publicar reseñas, subir imágenes | Usuario con sesión |
| Perfil, contraseña y borrado de cuenta | El propio usuario |

## Imágenes

`uploadAvatar` (server action) recibe un archivo, valida tipo (PNG, JPG, WEBP, GIF) y tamaño (máx. 5 MB) y devuelve un data URL Base64 que se guarda en la columna correspondiente. Se eligió así porque el sistema de archivos de Netlify es de solo lectura. El límite de cuerpo de las server actions es de 8 MB (`next.config.js`) para admitir imágenes de 5 MB codificadas en Base64.

## Asistente "Pizzi"

- El chatbot de la interfaz (`src/components/chatbot/chatbot.tsx`) responde con una **base de conocimiento local** por palabras clave; no llama a ninguna API de IA.
- `src/ai/` contiene flujos de **Genkit** con Gemini (`pizzapp-chat-flow.ts`) y una herramienta de geocodificación. Solo se usan desde `npm run genkit:dev` y necesitan `GOOGLE_GENAI_API_KEY`.
- `src/ai/flows/smart-search-suggestions.ts` alimenta el buscador con lógica local (sin IA, para no depender de límites de la API).

## Datos de pizzerías

El listado combina dos fuentes:
1. `src/lib/pizzerias-data.ts`: pizzerías de Hermosillo obtenidas de OpenStreetMap.
2. La tabla `Pizzeria`: altas manuales, importaciones y copias de las estáticas.

Si alguien reseña una pizzería que solo existe en el archivo estático, `addReview` la crea en la BD antes de guardar la reseña.
