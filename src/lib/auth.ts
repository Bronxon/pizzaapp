import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { isSuperAdminEmail } from "@/lib/super-admin"

/**
 * Las imágenes de perfil subidas se guardan en la BD como data URL (Base64).
 * Meterlas en el JWT haría crecer la cookie de sesión a cientos de KB, así que
 * en la sesión se expone una URL ligera que sirve la imagen desde la BD.
 */
function sessionImage(user: { id: string, image: string | null, updatedAt: Date }) {
    if (user.image?.startsWith("data:")) {
        return `/api/avatar/${user.id}?v=${user.updatedAt.getTime()}`
    }
    return user.image
}


export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid profile email"
                }
            }
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data
                    const user = await prisma.user.findUnique({ where: { email } })
                    if (!user || !user.password) return null
                    const passwordsMatch = await bcrypt.compare(password, user.password)
                    if (passwordsMatch) {
                        // Nunca devolver el hash de la contraseña.
                        return { id: user.id, email: user.email, name: user.name, image: user.image }
                    }
                }

                return null
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
                session.user.isAdmin = token.isAdmin === true
                session.user.isSuperAdmin = token.isSuperAdmin === true
                session.user.permissions = (token.permissions as string | null | undefined) ?? null
            }
            return session
        },
        async jwt({ token }) {
            if (!token.sub) return token;
            // Se relee el usuario en cada petición para que los cambios de rol
            // y permisos se apliquen sin tener que cerrar sesión.
            const user = await prisma.user.findUnique({ where: { id: token.sub } });
            if (user) {
                token.isAdmin = user.isAdmin;
                token.isSuperAdmin = isSuperAdminEmail(user.email);
                token.permissions = user.permissions;
                token.picture = sessionImage(user);
                token.name = user.name;
            }
            return token
        },
    },
})
