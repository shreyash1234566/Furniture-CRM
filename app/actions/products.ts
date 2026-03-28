'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createProductSchema, updateStockSchema } from '@/lib/validations/product'

export async function getProducts() {
  const products = await prisma.product.findMany({
    include: { category: true, warehouse: true },
    orderBy: { name: 'asc' },
  })

  return {
    success: true,
    data: products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      price: p.price,
      stock: p.stock,
      sold: p.sold,
      reorderLevel: p.reorderLevel,
      image: p.image,
      material: p.material,
      color: p.color,
      description: p.description,
      warehouse: p.warehouse?.name || 'Unassigned',
      lastRestocked: p.lastRestocked?.toISOString().split('T')[0] || null,
    })),
  }
}

export async function getProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, warehouse: true },
  })

  if (!product) return { success: false, error: 'Product not found' }
  return { success: true, data: product }
}

export async function createProduct(data: unknown) {
  const parsed = createProductSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { category, warehouse, ...rest } = parsed.data

  // Find or create category
  const cat = await prisma.category.upsert({
    where: { name: category },
    create: { name: category },
    update: {},
  })

  // Find or create warehouse if provided
  let warehouseId: number | undefined
  if (warehouse) {
    const wh = await prisma.warehouse.upsert({
      where: { name: warehouse },
      create: { name: warehouse },
      update: {},
    })
    warehouseId = wh.id
  }

  const product = await prisma.product.create({
    data: {
      ...rest,
      categoryId: cat.id,
      warehouseId,
    },
  })

  revalidatePath('/inventory')
  return { success: true, data: product }
}

export async function updateProduct(id: number, data: Partial<{
  name: string; price: number; stock: number; reorderLevel: number;
  material: string; color: string; description: string; image: string;
}>) {
  const product = await prisma.product.update({
    where: { id },
    data,
  })

  revalidatePath('/inventory')
  return { success: true, data: product }
}

export async function updateStock(data: unknown) {
  const parsed = updateStockSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const product = await prisma.product.update({
    where: { id: parsed.data.id },
    data: { stock: parsed.data.stock, lastRestocked: new Date() },
  })

  revalidatePath('/inventory')
  return { success: true, data: product }
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}

export async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
}

export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: {},
    include: { category: true },
    orderBy: { stock: 'asc' },
  })

  // Filter in JS since Prisma can't compare two columns directly
  return products.filter(p => p.stock <= p.reorderLevel).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    reorderLevel: p.reorderLevel,
    category: p.category.name,
  }))
}
