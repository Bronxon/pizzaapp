'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import { PERMISSIONS } from '@/lib/permissions';

export async function getFeatures() {
    try {
        const features = await prisma.featureCard.findMany({
            orderBy: { order: 'asc' }
        });
        return features;
    } catch (error) {
        console.error("Error fetching features:", error);
        return [];
    }
}

export async function createFeature(data: { title: string; description: string; iconName: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);

    await prisma.featureCard.create({
        data
    });
    revalidatePath('/');
}

export async function updateFeature(id: string, data: { title: string; description: string; iconName: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);

    await prisma.featureCard.update({
        where: { id },
        data
    });
    revalidatePath('/');
}

export async function deleteFeature(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);

    await prisma.featureCard.delete({
        where: { id }
    });
    revalidatePath('/');
}
