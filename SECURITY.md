# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad, **no abras un issue público**. Usa la opción *Report a vulnerability* de la pestaña **Security** de este repositorio (GitHub Private Vulnerability Reporting) o contacta a los mantenedores por el formulario de soporte de la app.

Incluye:
- Descripción del problema y su impacto.
- Pasos para reproducirlo.
- Versión o commit afectado.

Intentaremos responder en un plazo razonable y avisarte cuando haya una corrección.

## Buenas prácticas para quienes contribuyen

- **Nunca subas secretos** (`.env`, claves de API, `AUTH_SECRET`, cadenas de conexión). Usa `.env.example` como plantilla.
- **Nunca subas bases de datos locales** (`*.db`) ni exportaciones con datos de usuarios.
- Toda server action que modifique datos debe llamar a `requireUser()`, `requireAdmin(permiso)` o `requireSuperAdmin()` de `src/lib/authz.ts`.
- No devuelvas al cliente objetos `User` completos: usa `select` para excluir `password`.
- Si una clave se expone por error, **revócala y genera una nueva**; borrarla del historial de Git no basta.

## Antes de publicar el repositorio

Si el repositorio tuvo antes una base `dev.db`, un `.env` u otros secretos en su historial de Git, siguen siendo visibles aunque se borren en un commit nuevo. En ese caso:
1. Cambia las contraseñas y rota las claves afectadas (`AUTH_SECRET`, credenciales de Google, contraseña de la BD).
2. Publica el proyecto como un repositorio nuevo sin ese historial, o límpialo con [`git filter-repo`](https://github.com/newren/git-filter-repo).
