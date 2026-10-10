'use server'

import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { pizzeriasData } from "@/lib/pizzerias-data"
import { auth } from "@/lib/auth"
import { requireAdmin, requireUser } from "@/lib/authz"
import { PERMISSIONS, hasPermission } from "@/lib/permissions"
import { isSuperAdminEmail } from "@/lib/super-admin"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Nota de seguridad: cada función exportada de un archivo 'use server' es un
// endpoint público. Las que modifican datos verifican sesión/permisos con
// requireUser() / requireAdmin() aunque la interfaz ya oculte los botones.
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB (mismo límite que valida la interfaz)
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

const credentialsSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

export async function registerUser(email: string, password: string) {
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existingUser) {
        throw new Error("User already exists")
    }
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10)
    const user = await prisma.user.create({
        data: {
            email: parsed.data.email,
            password: hashedPassword,
        }
    })
    // No devolver el hash de la contraseña al cliente.
    return { id: user.id, email: user.email }
}

export async function getReviews(pizzeriaId: string) {
    const reviews = await prisma.review.findMany({
        where: { pizzeriaId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true, image: true } } }
    })
    // No se envía el correo completo de quien opina (dato personal): solo un
    // nombre visible (nombre del perfil o la parte local del correo).
    return reviews.map(({ user, ...review }) => ({
        ...review,
        user: {
            name: user.name || user.email?.split('@')[0] || null,
            image: user.image,
        },
    }))
}

export async function getAllPizzerias() {
    const pizzerias = await prisma.pizzeria.findMany({
        orderBy: { name: 'asc' },
        include: {
            reviews: {
                select: { rating: true }
            },
            _count: {
                select: { reviews: true }
            }
        }
    })

    return pizzerias.map(p => {
        const avgRating = p.reviews.length > 0
            ? p.reviews.reduce((a, b) => a + b.rating, 0) / p.reviews.length
            : 0

        const { reviews, _count, ...rest } = p
        return {
            ...rest,
            rating: avgRating,
            reviewCount: _count.reviews
        }
    })
}

export async function addPizzeria(data: { name: string, address: string, lat: number, lng: number, imageUrl?: string, category?: string, source?: string, phoneNumber?: string, website?: string, socialMedia?: string, schedule?: string, description?: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS)
    const id = crypto.randomUUID()
    return await prisma.pizzeria.create({
        data: {
            id,
            name: data.name,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            imageUrl: data.imageUrl,
            phoneNumber: data.phoneNumber,
            website: data.website,
            socialMedia: data.socialMedia,
            schedule: data.schedule,
            description: data.description,
        } as any
    })
}

export async function updatePizzeria(id: string, data: { name: string, address: string, lat: number, lng: number, imageUrl?: string, category?: string, source?: string, phoneNumber?: string, website?: string, socialMedia?: string, schedule?: string, description?: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS)
    return await prisma.pizzeria.upsert({
        where: { id },
        update: {
            name: data.name,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            imageUrl: data.imageUrl,
            phoneNumber: data.phoneNumber,
            website: data.website,
            socialMedia: data.socialMedia,
            schedule: data.schedule,
            description: data.description,
            // Preserve existing relationship/fields if any, but currently schema has none critical here other than items/reviews handled separately
        } as any,
        create: {
            id,
            name: data.name,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            imageUrl: data.imageUrl,
            phoneNumber: data.phoneNumber,
            website: data.website,
            socialMedia: data.socialMedia,
            schedule: data.schedule,
            description: data.description,
        } as any
    })
}

export async function addReview(pizzeriaId: string, rating: number, comment: string) {
    // El autor siempre es el usuario de la sesión (no se acepta un userId del cliente).
    const { id: userId } = await requireUser()

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("La calificación debe ser un entero entre 1 y 5")
    }
    if (!comment?.trim()) {
        throw new Error("El comentario no puede estar vacío")
    }

    // Ensure pizzeria exists
    const pizzeria = await prisma.pizzeria.findUnique({ where: { id: pizzeriaId } })
    if (!pizzeria) {
        const data = pizzeriasData.find(p => p.id === pizzeriaId)
        if (data) {
            await prisma.pizzeria.create({
                data: {
                    id: data.id,
                    name: data.name,
                    address: data.address,
                    lat: data.lat,
                    lng: data.lng,
                    imageUrl: null, // or data.imageUrl if available
                }
            })
        } else {
            throw new Error("Pizzería no encontrada")
        }
    }

    return await prisma.review.create({
        data: {
            rating,
            comment: comment.trim(),
            userId,
            pizzeriaId
        }
    })
}

export async function getTestimonials() {
    const testimonials = await prisma.testimonial.findMany({
        orderBy: { createdAt: 'desc' }
    })

    // Fetch users for these emails to get live avatar
    const emails = testimonials.map(t => t.email).filter((e): e is string => !!e)
    const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { email: true, image: true }
    })

    return testimonials.map(t => {
        const user = users.find(u => u.email === t.email)
        return {
            ...t,
            avatarUrl: user?.image || t.avatarUrl
        }
    })
}

export async function getRankingSettings() {
    const setting = await prisma.globalSettings.findUnique({
        where: { key: 'ranking' }
    })
    if (!setting) return null
    try {
        return JSON.parse(setting.value) as { pizzeriaIds: string[] }
    } catch (e) {
        return null
    }
}

/**
 * Perfil del usuario con sesión iniciada (o de otro usuario si quien consulta
 * es administrador). Nunca incluye el hash de la contraseña.
 */
export async function getUserProfile(userId: string) {
    const session = await auth()
    const sessionUserId = session?.user?.id
    if (!sessionUserId) return null

    if (userId !== sessionUserId) {
        const requester = await prisma.user.findUnique({
            where: { id: sessionUserId },
            select: { isAdmin: true, email: true },
        })
        if (!requester?.isAdmin && !isSuperAdminEmail(requester?.email)) {
            throw new Error("No autorizado")
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isAdmin: true,
            permissions: true,
            createdAt: true,
        },
    })
    if (!user) return null
    return { ...user, isSuperAdmin: isSuperAdminEmail(user.email) }
}

export async function deleteTestimonial(id: number) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT)
    return await prisma.testimonial.delete({
        where: { id }
    })
}

export async function replyTestimonial(id: number, text: string) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT)
    return await prisma.testimonial.update({
        where: { id },
        data: {
            replyText: text,
            repliedAt: new Date()
        }
    })
}

export async function updateRankingSettings(pizzeriaIds: string[]) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS)
    return await prisma.globalSettings.upsert({
        where: { key: 'ranking' },
        update: { value: JSON.stringify({ pizzeriaIds }) },
        create: { key: 'ranking', value: JSON.stringify({ pizzeriaIds }) }
    })
}

export async function deleteReview(id: number) {
    // Puede borrar: el autor de la opinión o un admin con permiso de reseñas.
    const user = await requireUser()
    const review = await prisma.review.findUnique({ where: { id }, select: { userId: true } })
    if (!review) throw new Error("Opinión no encontrada")
    if (review.userId !== user.id && !hasPermission(user, PERMISSIONS.MANAGE_REVIEWS)) {
        throw new Error("No autorizado")
    }
    return await prisma.review.delete({
        where: { id }
    })
}

export async function replyReview(id: number, text: string) {
    await requireAdmin(PERMISSIONS.MANAGE_REVIEWS)
    return await prisma.review.update({
        where: { id },
        data: {
            replyText: text,
            repliedAt: new Date()
        }
    })
}

export async function deletePizzeria(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS)
    return await prisma.pizzeria.delete({
        where: { id }
    })
}

/** Lanza error si userId no es el usuario de la sesión. */
async function requireSelf(userId: string) {
    const user = await requireUser()
    if (user.id !== userId) throw new Error("No autorizado")
    return user
}

/**
 * La sesión expone las fotos subidas como /api/avatar/<id> (ver lib/auth.ts).
 * Si el cliente reenvía esa URL, se conserva la imagen guardada en la BD.
 */
function isSessionAvatarUrl(imageUrl?: string) {
    return !!imageUrl && imageUrl.startsWith('/api/avatar/')
}

export async function updateUserAvatar(userId: string, imageUrl: string) {
    await requireSelf(userId)
    if (isSessionAvatarUrl(imageUrl)) return null
    return await prisma.user.update({
        where: { id: userId },
        data: { image: imageUrl },
        select: { id: true },
    })
}

export async function updateUserProfile(userId: string, name: string, imageUrl?: string) {
    await requireSelf(userId)
    return await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            ...(imageUrl && !isSessionAvatarUrl(imageUrl) ? { image: imageUrl } : {})
        },
        select: { id: true, name: true },
    })
}

export async function deleteUserAccount(userId: string) {
    await requireSelf(userId)
    await prisma.user.delete({
        where: { id: userId }
    })
    return { success: true }
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
    await requireSelf(userId)
    if (!newPassword || newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres')
    }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.password) {
        throw new Error('User not found or password not set')
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
        throw new Error('Contraseña actual incorrecta')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    })
    return { success: true }
}

export async function getLayoutSettings() {
    const setting = await prisma.globalSettings.findUnique({
        where: { key: 'layout_settings' }
    })
    const defaultSettings = {
        sheetWidth: 75,
        sheetWidthMobile: 100,
        cardScale: 1,
        cardScaleMobile: 1,
        buttonScale: 1,
        buttonLayout: 'grid',
        searchWidth: 50,
        searchWidthMobile: 90,
        searchHeight: 12,
        searchHeightMobile: 10,
        buttonsTop: 160,
        buttonsTopMobile: 160,
        buttonsRight: 16,
        buttonsRightMobile: 16,
        viewAllTop: 260,
        viewAllTopMobile: 260,
        viewAllRight: 16,
        viewAllRightMobile: 16,
        mapSettingsTop: 400,
        mapSettingsTopMobile: 400,
        mapSettingsRight: 16,
        mapSettingsRightMobile: 16,
        locateBtnTop: 160,
        locateBtnTopMobile: 160,
        locateBtnRight: 16,
        locateBtnRightMobile: 16,
        locateBtnScale: 1.0,
        locateBtnScaleMobile: 1.0,
        logoLeft: 16,
        logoLeftMobile: 16,
        logoTop: 0,
        logoTopMobile: 0,
        logoScale: 1.0,
        logoScaleMobile: 1.0,
        logoWidth: 120,
        logoWidthMobile: 120,
        chatbotWidth: 380,
        chatbotWidthMobile: 320,
        chatbotHeight: 500,
        chatbotHeightMobile: 450,
        chatbotScale: 1.0,
        chatbotScaleMobile: 1.0,
        headerActionsLeft: 0,
        headerActionsLeftMobile: 0,
        headerActionsTop: 0,
        headerActionsTopMobile: 0,
        headerActionsScale: 1.0,
        headerActionsScaleMobile: 1.0,
        headerActionsGap: 16,
        headerActionsGapMobile: 16,
        layerControlTop: 10,
        layerControlTopMobile: 10,
        popupWidth: 280,
        popupWidthMobile: 260,
        popupScale: 1,
        popupScaleMobile: 1,
        popupFontSize: 14,
        popupFontSizeMobile: 12,
        popupOffsetY: -35,
        popupOffsetYMobile: -35,
        mapHeight: 70,
        mapHeightMobile: 55,
        mapCenterOffset: 150,
        popupCenterOffset2D: 180,
        popupCenterOffset2DMobile: 150,
        popupCenterOffset3D: 250,
        popupCenterOffset3DMobile: 200,
        iconAnchorX: 25,
        iconAnchorY: 25,
        navInstructionTop: 16,
        navInstructionTopMobile: 16,
        navInstructionScale: 1.0,
        navInstructionScaleMobile: 1.0,
        navDashboardBottom: 0,
        navDashboardBottomMobile: 0,
        navDashboardScale: 1.0,
        navDashboardScaleMobile: 1.0,
        navStreetBottom: 112,
        navStreetBottomMobile: 112,
        navStreetScale: 1.0,
        navStreetScaleMobile: 1.0,
        navInstructionLeft: 0,
        navInstructionLeftMobile: 0,
        navDashboardLeft: 0,
        navDashboardLeftMobile: 0,
        navStreetLeft: 0,
        navStreetLeftMobile: 0,
        navInstructionWidth: 100,
        navInstructionWidthMobile: 100,
        navDashboardWidth: 100,
        navDashboardWidthMobile: 100,
        userMarkerScale: 1.0,
        userMarkerScaleMobile: 1.0,
        navSpeedBottom: 112,
        navSpeedBottomMobile: 112,
        navSpeedLeft: 0,
        navSpeedLeftMobile: 0,
        navSpeedScale: 1.0,
        navSpeedScaleMobile: 1.0,
        navInstructionFontSize: 24,
        navInstructionFontSizeMobile: 18,
        navDashboardFontSize: 30,
        navDashboardFontSizeMobile: 22,
        navNextLeft: 0,
        navNextLeftMobile: 0,
        navNextTop: 0,
        navNextTopMobile: 0,
        navNextScale: 1.0,
        navNextScaleMobile: 1.0,
        navNextWidth: 100,
        navNextWidthMobile: 100,
        navNextFontSize: 14,
        navNextFontSizeMobile: 14,
        startTripBottom: 40,
        startTripBottomMobile: 40,
        startTripLeft: 0,
        startTripLeftMobile: 0,
        startTripScale: 1.0,
        startTripScaleMobile: 1.0,
        mobilePageZoom: 0.85,
        // Welcome Screen 3D & Layout Settings
        welcome3DScale: 3.0,
        welcome3DScaleMobile: 3.2,
        welcome3DWidth: 100,
        welcome3DWidthMobile: 100,
        welcome3DHeight: 65,
        welcome3DHeightMobile: 48,
        welcome3DSpaceOffsetX: 0,
        welcome3DSpaceOffsetXMobile: 0,
        welcome3DSpaceOffsetY: 0,
        welcome3DSpaceOffsetYMobile: 0,
        welcome3DFov: 45,
        welcome3DFovMobile: 42,
        welcome3DRotationSpeed: 2.0,
        welcome3DRotationSpeedMobile: 2.0,
        welcomeLogoScale: 1.5,
        welcomeLogoScaleMobile: 1.25,
        welcomeLogoOffsetY: 0,
        welcomeLogoOffsetYMobile: 0,
        welcomeLogoOffsetX: 0,
        welcomeLogoOffsetXMobile: 0,
        welcomeLogoMarginBottom: 16,
        welcomeLogoMarginBottomMobile: 8,
        welcomeContentScale: 1.0,
        welcomeContentScaleMobile: 1.0,
        welcomeContentOffsetY: 0,
        welcomeContentOffsetYMobile: 0,
        welcomeContentOffsetX: 0,
        welcomeContentOffsetXMobile: 0,
        welcomeContentMarginTop: 0,
        welcomeContentMarginTopMobile: 4,
        welcomeContentSpacing: 32,
        welcomeContentSpacingMobile: 16,
        welcomeButtonsLayout: 'row',
        welcomeButtonsLayoutMobile: 'row'
    }
    if (!setting) return defaultSettings;
    try {
        const parsed = JSON.parse(setting.value);
        return { ...defaultSettings, ...parsed };
    } catch (e) {
        return defaultSettings;
    }
}

export async function updateLayoutSettings(settings: any) {
    // El editor de diseño está disponible para cualquier administrador.
    await requireAdmin()
    return await prisma.globalSettings.upsert({
        where: { key: 'layout_settings' },
        update: { value: JSON.stringify(settings) },
        create: { key: 'layout_settings', value: JSON.stringify(settings) }
    })
}

export async function uploadAvatar(formData: FormData) {
    await requireUser();
    try {
        const file = formData.get('file');
        if (!file) {
            throw new Error('No file uploaded or file is empty');
        }

        // Check if file is a string (e.g. if form submitted empty)
        if (typeof file === 'string') {
            throw new Error('Uploaded content is a string, not a file');
        }

        const fileObj = file as File;

        // Check if it's a file/blob and get its buffer
        let buffer: Buffer;
        if (typeof fileObj.arrayBuffer === 'function') {
            const bytes = await fileObj.arrayBuffer();
            buffer = Buffer.from(bytes);
        } else if (typeof (fileObj as any).stream === 'function') {
            // Fallback for older environments/streams
            const chunks = [];
            for await (const chunk of (fileObj as any).stream()) {
                chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
        } else {
            throw new Error('Unsupported file object type: cannot read bytes');
        }

        const mimeType = fileObj.type || 'image/jpeg';
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
            throw new Error('Formato no permitido. Usa PNG, JPG, WEBP o GIF.');
        }
        if (buffer.length > MAX_IMAGE_BYTES) {
            throw new Error('La imagen supera el tamaño máximo de 5 MB.');
        }

        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
    } catch (err: any) {
        console.error("[Server Action] Error in uploadAvatar:", err);
        throw new Error(err.message || 'Error al procesar la imagen en el servidor');
    }
}

export async function addTestimonial(data: { name: string, email?: string, comment: string, role?: string, avatarUrl?: string }) {
    if (!data.name?.trim() || !data.comment?.trim()) {
        throw new Error("Nombre y comentario son obligatorios")
    }
    // Si hay sesión, el correo es siempre el de la cuenta (evita suplantar a otro usuario).
    const session = await auth()
    const email = session?.user?.email ?? data.email

    return await prisma.testimonial.create({
        data: {
            name: data.name.trim(),
            email,
            content: data.comment,
            role: data.role,
            avatarUrl: data.avatarUrl
        }
    })
}

export async function getRankingStyles() {
    const setting = await prisma.globalSettings.findUnique({
        where: { key: 'ranking_styles' }
    })
    if (!setting) return null
    try {
        return JSON.parse(setting.value)
    } catch (e) {
        return null
    }
}

export async function updateRankingStyles(styles: any) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS)
    return await prisma.globalSettings.upsert({
        where: { key: 'ranking_styles' },
        update: { value: JSON.stringify(styles) },
        create: { key: 'ranking_styles', value: JSON.stringify(styles) }
    })
}
