'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import { PERMISSIONS } from '@/lib/permissions';

export async function getMenuItems(pizzeriaId: string) {
    try {
        const items = await prisma.menuItem.findMany({
            where: { pizzeriaId },
            orderBy: { createdAt: 'desc' }
        });
        return items;
    } catch (error) {
        console.error("Error fetching menu items:", error);
        return [];
    }
}

export async function createMenuItem(data: { name: string; description?: string; price: number; imageUrl?: string; category?: string; pizzeriaId: string; legend?: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS);

    await prisma.menuItem.create({
        data
    });
    revalidatePath('/');
}

export async function updateMenuItem(id: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; category?: string; legend?: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS);

    await prisma.menuItem.update({
        where: { id },
        data
    });
    revalidatePath('/');
}

export async function deleteMenuItem(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_PIZZERIAS);

    await prisma.menuItem.delete({
        where: { id }
    });
    revalidatePath('/');
}
