
import { db } from '../db';
import { usersTable, ordersTable, inventoryTable, deliveriesTable, productsTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User, type ClientDashboardStats, type AdminDashboardStats } from '../schema';
import { eq, count, sum, and, or, lt, SQL } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: input.password, // In real app, this would be hashed
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        company_name: input.company_name,
        phone: input.phone,
        address: input.address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Get user by id failed:', error);
    throw error;
  }
};

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    const updateData: any = {};
    
    if (input.email !== undefined) updateData.email = input.email;
    if (input.first_name !== undefined) updateData.first_name = input.first_name;
    if (input.last_name !== undefined) updateData.last_name = input.last_name;
    if (input.company_name !== undefined) updateData.company_name = input.company_name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};

export const getClientUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'client'))
      .execute();

    return results;
  } catch (error) {
    console.error('Get client users failed:', error);
    throw error;
  }
};

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

    // Get total revenue from shipped or delivered orders
    const revenueResult = await db.select({ 
      total: sum(ordersTable.total_amount) 
    })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.client_id, clientId),
        or(
          eq(ordersTable.status, 'shipped'),
          eq(ordersTable.status, 'delivered')
        )
      ))
      .execute();

    // Get low stock items count (quantity < 10)
    const lowStockResult = await db.select({ count: count() })
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.client_id, clientId),
        lt(inventoryTable.quantity, 10)
      ))
      .execute();

    return {
      totalOrders: totalOrdersResult[0].count,
      pendingOrders: pendingOrdersResult[0].count,
      deliveredOrders: deliveredOrdersResult[0].count,
      totalRevenue: revenueResult[0].total ? parseFloat(revenueResult[0].total) : 0,
      lowStockItems: lowStockResult[0].count
    };
  } catch (error) {
    console.error('Get client dashboard stats failed:', error);
    throw error;
  }
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    // Get total clients count
    const totalClientsResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'client'))
      .execute();

    // Get total orders count
    const totalOrdersResult = await db.select({ count: count() })
      .from(ordersTable)
      .execute();

    // Get total revenue from all orders
    const revenueResult = await db.select({ 
      total: sum(ordersTable.total_amount) 
    })
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

    return {
      totalClients: totalClientsResult[0].count,
      totalOrders: totalOrdersResult[0].count,
      totalRevenue: revenueResult[0].total ? parseFloat(revenueResult[0].total) : 0,
      pendingDeliveries: pendingDeliveriesResult[0].count,
      totalProducts: totalProductsResult[0].count
    };
  } catch (error) {
    console.error('Get admin dashboard stats failed:', error);
    throw error;
  }
};
