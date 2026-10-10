'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import { PERMISSIONS } from '@/lib/permissions';

export async function getHelpCards() {
    return await prisma.helpCenterCard.findMany({
        orderBy: { order: 'asc' },
    });
}

export async function createHelpCard(data: { title: string; description: string; iconName: string; buttonText: string; link: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.helpCenterCard.create({
        data,
    });
    revalidatePath('/help');
}

export async function updateHelpCard(id: string, data: { title: string; description: string; iconName: string; buttonText: string; link: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.helpCenterCard.update({
        where: { id },
        data,
    });
    revalidatePath('/help');
}

export async function deleteHelpCard(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.helpCenterCard.delete({
        where: { id },
    });
    revalidatePath('/help');
}
