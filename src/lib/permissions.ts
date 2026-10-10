/**
 * Modelo de permisos de PizzApp (compartido entre cliente y servidor).
 *
 * - Superadministrador: el usuario cuyo correo coincide con la variable de
 *   entorno SUPER_ADMIN_EMAIL. Tiene todos los permisos y es el único que puede
 *   otorgar o retirar roles (/admin/granting).
 * - Administrador: usuario con `isAdmin = true`. Sus capacidades dependen de la
 *   lista `permissions` (cadena separada por comas).
 *
 * IMPORTANTE: las comprobaciones del cliente solo ocultan/mostrar la interfaz.
 * La autorización real se hace en el servidor (ver src/lib/authz.ts).
 */

export const PERMISSIONS = {
  MANAGE_PIZZERIAS: 'manage_pizzerias',
  MANAGE_REVIEWS: 'manage_reviews',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionSubject = {
  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;
  permissions?: string | null;
} | null | undefined;

export function parsePermissions(permissions?: string | null): string[] {
  if (!permissions) return [];
  return permissions
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** El superadmin siempre tiene permiso; un admin necesita el permiso explícito. */
export function hasPermission(subject: PermissionSubject, permission: Permission): boolean {
  if (!subject) return false;
  if (subject.isSuperAdmin) return true;
  if (!subject.isAdmin) return false;
  return parsePermissions(subject.permissions).includes(permission);
}

/** Acceso al panel de administración (cualquier admin o el superadmin). */
export function isAdminUser(subject: PermissionSubject): boolean {
  return !!subject && (!!subject.isSuperAdmin || !!subject.isAdmin);
}
