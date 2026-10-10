/**
 * El superadministrador se define con la variable de entorno SUPER_ADMIN_EMAIL
 * (solo servidor). Así el correo no queda escrito en el código ni en el bundle
 * del navegador; el cliente recibe únicamente `session.user.isSuperAdmin`.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  const superAdmin = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!superAdmin || !email) return false;
  return email.trim().toLowerCase() === superAdmin;
}
