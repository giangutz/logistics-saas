
import { db } from '../db';
import { usersTable, ordersTable, productsTable, deliveriesTable, inventoryTable } from '../db/schema';
import { type ClientDashboardStats, type AdminDashboardStats } from '../schema';
import { eq, count, sum, and, sql, or } from 'drizzle-orm';

export const getClientDashboardStats = async (clientId: number): Promise<ClientDashboardStats> => {
  try {
    // Get total orders count
    const totalOrdersResult = await db.select({ count: count() })
      .from(ordersTable)
      .where(eq(ordersTable.client_id, clientId))
      .execute();

    // Get pending orders count
    const pendingOrdersResult = await db.select({ count: count() })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.client_id, clientId),
        eq(ordersTable.status, 'pending')
      ))
      .execute();

    // Get delivered orders count
    const deliveredOrdersResult = await db.select({ count: count() })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.client_id, clientId),
        eq(ordersTable.status, 'delivered')
      ))
      .execute();

    // Get total revenue for client - only from shipped or delivered orders
    const revenueResult = await db.select({ total: sum(ordersTable.total_amount) })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.client_id, clientId),
        or(
          eq(ordersTable.status, 'shipped'),
          eq(ordersTable.status, 'delivered')
        )
      ))
      .execute();

    // Get low stock items count from inventory (available quantity <= 10)
    const lowStockResult = await db.select({ count: count() })
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.client_id, clientId),
        sql`(${inventoryTable.quantity} - ${inventoryTable.reserved_quantity}) <= 10`
      ))
      .execute();

    const totalRevenue = revenueResult[0]?.total ? parseFloat(revenueResult[0].total) : 0;

    return {
      totalOrders: totalOrdersResult[0]?.count || 0,
      pendingOrders: pendingOrdersResult[0]?.count || 0,
      deliveredOrders: deliveredOrdersResult[0]?.count || 0,
      totalRevenue,
      lowStockItems: lowStockResult[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get client dashboard stats:', error);
    throw error;
  }
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    // Get total clients count (role = 'client')
    const totalClientsResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'client'))
      .execute();

    // Get total orders count
    const totalOrdersResult = await db.select({ count: count() })
      .from(ordersTable)
      .execute();

    // Get total revenue across all orders
    const revenueResult = await db.select({ total: sum(ordersTable.total_amount) })
      .from(ordersTable)
      .execute();

    // Get pending deliveries count
    const pendingDeliveriesResult = await db.select({ count: count() })
      .from(deliveriesTable)
      .where(eq(deliveriesTable.status, 'pending'))
      .execute();

    // Get total products count
    const totalProductsResult = await db.select({ count: count() })
      .from(productsTable)
      .execute();

    const totalRevenue = revenueResult[0]?.total ? parseFloat(revenueResult[0].total) : 0;

    return {
      totalClients: totalClientsResult[0]?.count || 0,
      totalOrders: totalOrdersResult[0]?.count || 0,
      totalRevenue,
      pendingDeliveries: pendingDeliveriesResult[0]?.count || 0,
      totalProducts: totalProductsResult[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get admin dashboard stats:', error);
    throw error;
  }
};

export const getRevenueByClient = async (clientId: number): Promise<number> => {
  try {
    const result = await db.select({ total: sum(ordersTable.total_amount) })
      .from(ordersTable)
      .where(eq(ordersTable.client_id, clientId))
      .execute();

    return result[0]?.total ? parseFloat(result[0].total) : 0;
  } catch (error) {
    console.error('Failed to get revenue by client:', error);
    throw error;
  }
};

export const getTotalSystemRevenue = async (): Promise<number> => {
  try {
    const result = await db.select({ total: sum(ordersTable.total_amount) })
      .from(ordersTable)
      .execute();

    return result[0]?.total ? parseFloat(result[0].total) : 0;
  } catch (error) {
    console.error('Failed to get total system revenue:', error);
    throw error;
  }
};

export const getOrderStatusCounts = async (clientId?: number): Promise<Record<string, number>> => {
  try {
    const baseQuery = db.select({
      status: ordersTable.status,
      count: count()
    }).from(ordersTable);

    let results;
    if (clientId !== undefined) {
      results = await baseQuery
        .where(eq(ordersTable.client_id, clientId))
        .groupBy(ordersTable.status)
        .execute();
    } else {
      results = await baseQuery
        .groupBy(ordersTable.status)
        .execute();
    }

    const statusCounts: Record<string, number> = {};
    results.forEach(result => {
      statusCounts[result.status] = result.count;
    });

    return statusCounts;
  } catch (error) {
    console.error('Failed to get order status counts:', error);
    throw error;
  }
};

export const getDeliveryStatusCounts = async (): Promise<Record<string, number>> => {
  try {
    const results = await db.select({
      status: deliveriesTable.status,
      count: count()
    })
      .from(deliveriesTable)
      .groupBy(deliveriesTable.status)
      .execute();

    const statusCounts: Record<string, number> = {};
    results.forEach(result => {
      statusCounts[result.status] = result.count;
    });

    return statusCounts;
  } catch (error) {
    console.error('Failed to get delivery status counts:', error);
    throw error;
  }
};
