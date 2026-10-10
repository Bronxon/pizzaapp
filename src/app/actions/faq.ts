'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import { PERMISSIONS } from '@/lib/permissions';

export async function getFaqCategories() {
    return await prisma.faqCategory.findMany({
        include: {
            questions: {
                orderBy: { order: 'asc' },
            },
        },
        orderBy: { order: 'asc' },
    });
}

export async function createFaqCategory(data: { title: string; iconName: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqCategory.create({
        data,
    });
    revalidatePath('/faq');
}

export async function updateFaqCategory(id: string, data: { title: string; iconName: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqCategory.update({
        where: { id },
        data,
    });
    revalidatePath('/faq');
}

export async function deleteFaqCategory(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqCategory.delete({
        where: { id },
    });
    revalidatePath('/faq');
}

export async function createFaqQuestion(data: { question: string; answer: string; categoryId: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqQuestion.create({
        data,
    });
    revalidatePath('/faq');
}

export async function updateFaqQuestion(id: string, data: { question: string; answer: string }) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqQuestion.update({
        where: { id },
        data,
    });
    revalidatePath('/faq');
}

export async function deleteFaqQuestion(id: string) {
    await requireAdmin(PERMISSIONS.MANAGE_CONTENT);
    await prisma.faqQuestion.delete({
        where: { id },
    });
    revalidatePath('/faq');
}
