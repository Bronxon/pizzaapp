'use server'

import { auth } from "@/lib/auth"
import { requireSuperAdmin } from "@/lib/authz"
import { isSuperAdminEmail } from "@/lib/super-admin"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getManageableUsers() {
    await requireSuperAdmin()

    // Fetch all users to allow granting/revoking
    // In a real app, you might want pagination
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isAdmin: true,
            permissions: true,
            lastActiveAt: true
        }
    })
    return users.map(u => ({ ...u, isSuperAdmin: isSuperAdminEmail(u.email) }))
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
    const superAdmin = await requireSuperAdmin()
    if (userId === superAdmin.id) {
        throw new Error("No puedes cambiar tu propio rol de superadministrador")
    }

    await prisma.user.update({
        where: { id: userId },
        data: { isAdmin }
    })
    revalidatePath("/admin/granting")
}

export async function updatePermissions(userId: string, permissions: string) {
    await requireSuperAdmin()

    await prisma.user.update({
        where: { id: userId },
        data: { permissions }
    })
    revalidatePath("/admin/granting")
}

export async function updateHeartbeat() {
    const session = await auth()
    if (!session?.user?.id) return

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { lastActiveAt: new Date() }
        })
    } catch (err: any) {
        if (err.code !== 'P2025') {
            console.log("Error updating heartbeat:", err)
        }
    }
}

export async function markUserOffline() {
    const session = await auth()
    if (!session?.user?.id) return

    // Set lastActiveAt to 5 minutes ago to ensure they appear offline immediately
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { lastActiveAt: fiveMinutesAgo }
        })
    } catch (err: any) {
        if (err.code !== 'P2025') {
            console.log("Error marking user offline:", err)
        }
    }
}

export async function deleteUser(userId: string) {
    const superAdmin = await requireSuperAdmin()

    if (userId === superAdmin.id) {
        throw new Error("Cannot delete your own account")
    }

    await prisma.user.delete({
        where: { id: userId }
    })
    revalidatePath("/admin/granting")
}
