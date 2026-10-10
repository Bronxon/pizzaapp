# Cumplimiento legal y riesgos (análisis preliminar)

> **Alcance y limitaciones.** Revisión técnica preliminar hecha a partir del código fuente (versión 1.1.0, octubre de 2026). **No es asesoría jurídica.** Antes de operar PizzApp de forma pública o comercial, los puntos marcados como *Alto* deben validarse con un abogado en protección de datos y propiedad intelectual.

## 1. Contexto

| Elemento | Situación |
|---|---|
| Producto | Guía web, de escritorio y móvil de pizzerías de Hermosillo, con reseñas y cuentas de usuario |
| Jurisdicción supuesta | México (operación y usuarios principalmente en Sonora) |
| Modelo de negocio | Gratuito; sin pagos, pedidos ni publicidad en el código actual |
| Responsable del tratamiento | **Por definir**: debe identificarse en el aviso de privacidad (persona física o moral, domicilio y contacto) |
| Proveedores de infraestructura | Netlify (hosting) y Neon (PostgreSQL); su ubicación implica posible almacenamiento fuera de México |

## 2. Inventario de datos personales

| Dato | Dónde se guarda | Finalidad | Observaciones |
|---|---|---|---|
| Correo electrónico | `User.email`, `ContactMessage.email`, `Testimonial.email` | Cuenta, soporte, autoría | Ya no se envía a otros visitantes en el listado de reseñas |
| Nombre | `User.name`, `Testimonial.name`, `ContactMessage.name` | Mostrar autoría | Público junto a reseñas y testimonios |
| Contraseña | `User.password` (hash bcrypt) | Autenticación | Nunca se devuelve al cliente |
| Foto de perfil | `User.image` (Base64 o URL de Google) | Avatar | Pública junto a reseñas |
| Ubicación precisa | No se guarda; se usa en el navegador | Centrar el mapa y calcular rutas | **Se envía a `router.project-osrm.org`** al pedir una ruta |
| Actividad | `User.lastActiveAt` | Mostrar usuarios en línea al superadmin | Se actualiza periódicamente |
| Mensajes e imágenes de soporte | `ContactMessage`, `ContactReply` | Atención a usuarios | Pueden contener cualquier dato que el usuario escriba |
| Tokens OAuth | `Account` | Inicio de sesión con Google | Gestionados por Auth.js |

## 3. Terceros que reciben datos

| Tercero | Qué recibe | Riesgo / acción |
|---|---|---|
| Google (teselas `mt*.google.com`) | IP y zona del mapa consultada | Uso de teselas **sin API oficial ni clave**; probablemente contrario a los términos de Google Maps Platform. Además, el control de atribución del mapa está desactivado (`attributionControl: false`). |
| OSRM público (`router.project-osrm.org`) | Coordenadas de origen (usuario) y destino | Servidor de demostración sin garantías ni uso en producción permitido según su política. |
| Nominatim / Overpass (OSM) | Consultas de búsqueda / zona | Políticas de uso justo; requieren User-Agent identificable y atribución. Los datos de `pizzerias-data.ts` vienen de OSM (licencia ODbL: exige atribución "© OpenStreetMap contributors"). |
| DiceBear, avatar.iran.liara.run | Nombre del usuario (como semilla del avatar) | Revisar sus términos y mencionarlos en el aviso de privacidad. |
| Google OAuth / Gemini | Identidad (OAuth); mensajes (solo en flujos de Genkit) | Mencionar en el aviso de privacidad. |
| Netlify, Neon | Todos los datos | Proveedores (encargados); posible transferencia internacional. |

**Inconsistencia detectada:** la página `/privacy` y el chatbot afirman "No compartimos tus datos personales con terceros". Con la arquitectura actual esto **no es exacto**: el aviso debe listar a estos destinatarios o encargados.

## 4. Marco normativo a revisar (México)

| Norma | Por qué podría aplicar |
|---|---|
| Ley Federal de Protección de Datos Personales en Posesión de los Particulares (nueva ley publicada el 20/03/2025, vigente desde el 21/03/2025) | Se recaban correo, nombre, foto y se usa la ubicación. Exige aviso de privacidad (incluido el simplificado para medios electrónicos), mecanismos para derechos ARCO y medidas de seguridad. La autoridad competente pasó del extinto INAI a la Secretaría Anticorrupción y Buen Gobierno. |
| Ley Federal del Derecho de Autor | Imágenes, logos de pizzerías, modelo 3D (`public/pizza-model.glb`) e imágenes subidas de terceros. |
| Ley Federal de Protección a la Propiedad Industrial | Uso de marcas de cadenas (Pizza Hut, Domino's, Little Caesars…) y de la propia marca "PizzApp". |
| Ley Federal de Protección al Consumidor | Solo si en el futuro se agregan promociones, publicidad pagada o ventas. |

Verificar la vigencia del Reglamento de la nueva ley de datos y los lineamientos aplicables antes de redactar el aviso definitivo.

## 5. Matriz de riesgos

Escala interna: Probabilidad (P) e Impacto (I) de 1 a 5; puntuación = P × I (1–4 bajo, 5–9 moderado, 10–15 alto, 16–25 crítico).

| ID | Riesgo | P | I | Punt. | Estado / acción |
|---|---|---|---|---|---|
| R1 | Server actions sin autorización (cualquiera podía borrar pizzerías, cuentas o contenido) | 5 | 5 | 25 | **Corregido** en 1.1.0 (`src/lib/authz.ts`). |
| R2 | Hash de contraseña enviado al navegador (`getUserProfile`, `registerUser`) | 4 | 4 | 16 | **Corregido**. |
| R3 | `dev.db` con usuarios y hashes incluida en el repositorio | 4 | 4 | 16 | **Corregido** (eliminada e ignorada). Revisar el historial de Git (ver `SECURITY.md`). |
| R4 | Correo personal del superadmin y contraseña `admin123` en el código | 4 | 3 | 12 | **Corregido** (`SUPER_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). |
| R5 | Aviso de privacidad incompleto e inexacto | 4 | 3 | 12 | **Pendiente.** Redactar aviso integral y simplificado; identificar responsable, finalidades, terceros, transferencias y medio para derechos ARCO. |
| R6 | Teselas de Google sin licencia y sin atribución visible | 3 | 4 | 12 | **Pendiente.** Migrar a un proveedor con licencia (MapTiler, Stadia, Google Maps Platform con clave) y mostrar atribución. |
| R7 | Uso del OSRM de demostración en producción | 3 | 3 | 9 | **Pendiente.** Usar un servicio de rutas con plan adecuado (OpenRouteService, Mapbox, HERE) o un OSRM propio. |
| R8 | Imágenes y modelo 3D de terceros sin licencia documentada (`public/uploads/`, `pizza-model.glb`, logos de pizzerías) | 3 | 3 | 9 | **Pendiente.** Documentar origen y licencia o reemplazar por material propio o con licencia libre. |
| R9 | Reseñas falsas o difamatorias (no se exige interacción previa con la pizzería) | 3 | 3 | 9 | **Pendiente.** Reglas de moderación publicadas, canal de reclamación para negocios y límites por usuario. |
| R10 | Sin licencia de software definida | 2 | 2 | 4 | **Pendiente.** Elegir licencia y agregar `LICENSE`. |
| R11 | Falta atribución de OpenStreetMap (ODbL) | 3 | 2 | 6 | **Pendiente.** Mostrar "© OpenStreetMap contributors" donde se usen sus datos. |

## 6. Requisitos verificables propuestos

| ID | Requisito | Criterio de aceptación | Componente |
|---|---|---|---|
| REQ-01 | Toda server action de escritura valida sesión y permiso | Llamar la acción sin sesión o sin permiso devuelve error | `src/app/actions*`, `src/lib/authz.ts` |
| REQ-02 | Ninguna respuesta al cliente incluye `User.password` | Revisión de `select` en consultas a `User` | `src/app/actions.ts` |
| REQ-03 | Aviso de privacidad accesible antes del registro | Enlace visible en `/login`, footer y app móvil | `/privacy`, `/login` |
| REQ-04 | El usuario puede eliminar su cuenta y sus datos | "Eliminar cuenta" borra usuario, reseñas, sesiones y cuentas vinculadas (ya ocurre por cascada). **Pendiente:** testimonios y mensajes de soporte se ligan por correo y hoy no se borran | `deleteUserAccount` |
| REQ-05 | Atribución de mapas y datos | Créditos visibles en el mapa | `pizza-map.tsx` |
| REQ-06 | Inventario de licencias de dependencias | Archivo generado con `npx license-checker --summary` o SBOM (CycloneDX) | Repositorio |

## 7. Fuentes consultadas (10/10/2026)

- [Ley Federal de Protección de Datos Personales en Posesión de los Particulares — Orden Jurídico Nacional](https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo125102.html)
- [Littler: México tiene nueva ley en materia de protección de datos personales](https://www.littler.com/es/news-analysis/asap/mexico-tiene-nueva-ley-en-materia-de-proteccion-de-datos-personales)
- [Política de uso de Nominatim](https://operations.osmfoundation.org/policies/nominatim/)
- [Licencia y atribución de OpenStreetMap](https://www.openstreetmap.org/copyright)
- [Términos de Google Maps Platform](https://cloud.google.com/maps-platform/terms)
