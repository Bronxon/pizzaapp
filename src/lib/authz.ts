/**
 * Autorización del lado del servidor.
 *
 * Toda server action que modifique datos o lea información privada debe llamar
 * a una de estas funciones. Las server actions son endpoints HTTP públicos:
 * ocultar un botón en la interfaz NO impide que alguien las invoque.
 *
 * No importar este archivo desde componentes de cliente.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminUser, type Permission } from '@/lib/permissions';
import { isSuperAdminEmail } from '@/lib/super-admin';

export { isSuperAdminEmail };

/** Devuelve el usuario autenticado leído de la BD (con rol vigente) o null. */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, image: true, isAdmin: true, permissions: true },
  });
  if (!user) return null;

  return { ...user, isSuperAdmin: isSuperAdminEmail(user.email) };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  return user;
}

/** Exige rol de administrador y, si se indica, un permiso concreto. */
export async function requireAdmin(permission?: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = permission ? hasPermission(user, permission) : isAdminUser(user);
  if (!allowed) throw new Error('No autorizado');
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new Error('No autorizado');
  return user;
}
