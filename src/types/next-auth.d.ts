import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      permissions?: string | null;
    } & DefaultSession['user'];
  }
}
