'use server'

import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/authz"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

/** Cualquier administrador (o el superadmin) puede atender mensajes de soporte. */
async function verifyAdmin() {
    return await requireAdmin()
}

export async function sendContactMessage(data: { name: string, email: string, subject: string, message: string, image?: string }) {
    if (!data.name || !data.email || !data.subject || !data.message) {
        throw new Error("Todos los campos son obligatorios")
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error("Correo electrónico inválido")
    }

    return await prisma.contactMessage.create({
        data: {
            name: data.name,
            email: data.email,
            subject: data.subject,
            message: data.message,
            image: data.image || null,
            status: "pending"
        }
    })
}

export async function getContactMessages() {
    await verifyAdmin()

    return await prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            replies: {
                orderBy: { createdAt: 'asc' }
            }
        }
    })
}

export async function sendAdminReply(messageId: string, content: string, image?: string) {
    const admin = await verifyAdmin()

    if (!content.trim() && !image) {
        throw new Error("El mensaje o la imagen no pueden estar vacíos")
    }

    // 1. Create reply - Admins always display exactly "Administrador" in name
    const reply = await prisma.contactReply.create({
        data: {
            messageId,
            senderName: "Administrador",
            senderEmail: admin.email || "",
            content,
            image: image || null
        }
    })

    // 2. Update parent message status to 'in_progress' if it was 'pending'
    const parent = await prisma.contactMessage.findUnique({ where: { id: messageId } })
    if (parent && parent.status === "pending") {
        await prisma.contactMessage.update({
            where: { id: messageId },
            data: { status: "in_progress" }
        })
    }

    revalidatePath("/admin/messages")
    return reply
}

export async function updateMessageStatus(messageId: string, status: "pending" | "in_progress" | "resolved") {
    await verifyAdmin()

    const updated = await prisma.contactMessage.update({
        where: { id: messageId },
        data: { status }
    })

    revalidatePath("/admin/messages")
    return updated
}

export async function deleteContactMessage(messageId: string) {
    await verifyAdmin()

    await prisma.contactMessage.delete({
        where: { id: messageId }
    })

    revalidatePath("/admin/messages")
}

export async function getUserContactMessages() {
    const session = await auth()
    if (!session?.user?.email) {
        throw new Error("No autenticado: Inicia sesión para ver tus mensajes")
    }

    return await prisma.contactMessage.findMany({
        where: {
            email: session.user.email
        },
        orderBy: { createdAt: 'desc' },
        include: {
            replies: {
                orderBy: { createdAt: 'asc' }
            }
        }
    })
}

export async function sendUserReply(messageId: string, content: string, image?: string) {
    const session = await auth()
    if (!session?.user?.email) {
        throw new Error("No autenticado")
    }

    if (!content.trim() && !image) {
        throw new Error("El mensaje o la imagen no pueden estar vacíos")
    }

    // Verify ownership of the contact message
    const message = await prisma.contactMessage.findUnique({
        where: { id: messageId }
    })

    if (!message) {
        throw new Error("Conversación no encontrada")
    }

    if (message.email.toLowerCase() !== session.user.email.toLowerCase()) {
        throw new Error("No autorizado para responder a este mensaje")
    }

    // Create the reply from the user - Name from config or fallback to "Usuario"
    const displayName = session.user.name || "Usuario"

    const reply = await prisma.contactReply.create({
        data: {
            messageId,
            senderName: displayName,
            senderEmail: session.user.email,
            content,
            image: image || null
        }
    })

    // Update parent message status back to 'pending' to alert admins
    await prisma.contactMessage.update({
        where: { id: messageId },
        data: { status: "pending" }
    })

    revalidatePath("/admin/messages")
    revalidatePath("/messages")
    return reply
}
