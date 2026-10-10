/**
 * Crea (o promueve) la cuenta del superadministrador.
 *
 * Uso:
 *   SEED_ADMIN_PASSWORD="una-contraseña-segura" npm run db:seed
 *
 * El correo se toma de SUPER_ADMIN_EMAIL (el mismo que usa la app para
 * reconocer al superadmin). Si la cuenta ya existe, solo se le asignan rol y
 * permisos: su contraseña NO se sobrescribe.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ALL_PERMISSIONS = [
    'manage_pizzerias',
    'manage_reviews',
    'manage_content',
    'manage_users',
    'view_analytics',
].join(',')

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim()
    if (!email) {
        throw new Error('Define SUPER_ADMIN_EMAIL en tu archivo .env antes de ejecutar la semilla.')
    }

    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
        await prisma.user.update({
            where: { email },
            data: { isAdmin: true, permissions: ALL_PERMISSIONS },
        })
        console.log(`✔ Usuario existente promovido a superadministrador: ${email}`)
        return
    }

    const plainPassword = process.env.SEED_ADMIN_PASSWORD
    if (!plainPassword || plainPassword.length < 8) {
        throw new Error('Define SEED_ADMIN_PASSWORD (mínimo 8 caracteres) para crear la cuenta del superadministrador.')
    }

    await prisma.user.create({
        data: {
            email,
            name: 'Super Admin',
            password: await bcrypt.hash(plainPassword, 10),
            isAdmin: true,
            permissions: ALL_PERMISSIONS,
        },
    })
    console.log(`✔ Superadministrador creado: ${email}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
