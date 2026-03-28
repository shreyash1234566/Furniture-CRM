'use server'

import { prisma } from '@/lib/db'

export async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    leadsToday,
    appointmentsToday,
    activeOrders,
    totalRevenue,
    recentLeads,
    upcomingAppointments,
    bestSellers,
    lowStockProducts,
  ] = await Promise.all([
    prisma.lead.count({ where: { date: { gte: today } } }),
    prisma.appointment.count({ where: { date: { gte: today }, status: 'Scheduled' } }),
    prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } } }),
    prisma.order.aggregate({ _sum: { amount: true } }),
    prisma.lead.findMany({
      take: 6,
      orderBy: { date: 'desc' },
      include: { contact: true },
    }),
    prisma.appointment.findMany({
      where: { status: 'Scheduled' },
      take: 5,
      orderBy: { date: 'asc' },
      include: { contact: true },
    }),
    prisma.product.findMany({
      take: 8,
      orderBy: { sold: 'desc' },
      where: { sold: { gt: 0 } },
    }),
    // Raw query to get products where stock <= reorderLevel
    prisma.$queryRaw`SELECT id, name, "categoryId", stock, "reorderLevel", image FROM "Product" WHERE stock <= "reorderLevel" ORDER BY stock ASC LIMIT 10` as Promise<any[]>,
  ])

  // Get category names for low stock items
  const categoryIds = lowStockProducts.map((p: any) => p.categoryId).filter(Boolean)
  const categoriesMap: Record<number, string> = {}
  if (categoryIds.length > 0) {
    const cats = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    for (const c of cats) categoriesMap[c.id] = c.name
  }

  return {
    success: true,
    data: {
      leadsToday,
      appointmentsToday,
      activeOrders,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentLeads: recentLeads.map(l => ({
        id: l.id,
        name: l.contact.name,
        interest: l.interest,
        status: l.status,
        source: l.source,
      })),
      upcomingAppointments: upcomingAppointments.map(a => ({
        id: a.id,
        customer: a.contact.name,
        date: a.date.toISOString().split('T')[0],
        time: a.time,
        purpose: a.purpose,
      })),
      bestSellers: bestSellers.map(p => ({
        name: p.name,
        sold: p.sold,
      })),
      lowStockItems: lowStockProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: categoriesMap[p.categoryId] || '',
        stock: p.stock,
        image: p.image,
      })),
    },
  }
}
