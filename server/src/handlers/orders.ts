
import { db } from '../db';
import { ordersTable, orderItemsTable, usersTable, productsTable } from '../db/schema';
import { type Order, type CreateOrderInput, type UpdateOrderInput, type OrderItem, type CreateOrderItemInput } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  try {
    // Verify client exists
    const client = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.client_id))
      .execute();

    if (client.length === 0) {
      throw new Error('Client not found');
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await db.insert(ordersTable)
      .values({
        client_id: input.client_id,
        order_number: orderNumber,
        shipping_address: input.shipping_address,
        billing_address: input.billing_address,
        notes: input.notes,
        total_amount: '0' // Start with 0, will be calculated when items are added
      })
      .returning()
      .execute();

    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const results = await db.select()
      .from(ordersTable)
      .execute();

    return results.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount)
    }));
  } catch (error) {
    console.error('Failed to get orders:', error);
    throw error;
  }
};

export const getOrdersByClient = async (clientId: number): Promise<Order[]> => {
  try {
    const results = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.client_id, clientId))
      .execute();

    return results.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount)
    }));
  } catch (error) {
    console.error('Failed to get orders by client:', error);
    throw error;
  }
};

export const getOrderById = async (id: number): Promise<Order> => {
  try {
    const results = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error('Order not found');
    }

    const order = results[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Failed to get order by id:', error);
    throw error;
  }
};

export const updateOrder = async (input: UpdateOrderInput): Promise<Order> => {
  try {
    // Verify order exists
    const existing = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Order not found');
    }

    const updateData: any = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.shipping_address !== undefined) updateData.shipping_address = input.shipping_address;
    if (input.billing_address !== undefined) updateData.billing_address = input.billing_address;
    if (input.notes !== undefined) updateData.notes = input.notes;
    updateData.updated_at = new Date();

    const result = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order update failed:', error);
    throw error;
  }
};

export const deleteOrder = async (id: number): Promise<void> => {
  try {
    // Verify order exists
    const existing = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Order not found');
    }

    // Delete order items first (foreign key constraint)
    await db.delete(orderItemsTable)
      .where(eq(orderItemsTable.order_id, id))
      .execute();

    // Delete the order
    await db.delete(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();
  } catch (error) {
    console.error('Order deletion failed:', error);
    throw error;
  }
};

export const addOrderItem = async (input: CreateOrderItemInput): Promise<OrderItem> => {
  try {
    // Verify order exists
    const order = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (order.length === 0) {
      throw new Error('Order not found');
    }

    // Verify product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error('Product not found');
    }

    // Calculate total price
    const totalPrice = input.quantity * input.unit_price;

    const result = await db.insert(orderItemsTable)
      .values({
        order_id: input.order_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(),
        total_price: totalPrice.toString()
      })
      .returning()
      .execute();

    // Update order total
    await calculateOrderTotal(input.order_id);

    const orderItem = result[0];
    return {
      ...orderItem,
      unit_price: parseFloat(orderItem.unit_price),
      total_price: parseFloat(orderItem.total_price)
    };
  } catch (error) {
    console.error('Order item creation failed:', error);
    throw error;
  }
};

export const getOrderItems = async (orderId: number): Promise<OrderItem[]> => {
  try {
    const results = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId))
      .execute();

    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));
  } catch (error) {
    console.error('Failed to get order items:', error);
    throw error;
  }
};

export const removeOrderItem = async (id: number): Promise<void> => {
  try {
    // Get the order item to find the order_id
    const orderItem = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.id, id))
      .execute();

    if (orderItem.length === 0) {
      throw new Error('Order item not found');
    }

    const orderId = orderItem[0].order_id;

    // Delete the order item
    await db.delete(orderItemsTable)
      .where(eq(orderItemsTable.id, id))
      .execute();

    // Update order total
    await calculateOrderTotal(orderId);
  } catch (error) {
    console.error('Order item removal failed:', error);
    throw error;
  }
};

export const calculateOrderTotal = async (orderId: number): Promise<number> => {
  try {
    // Calculate sum of all order items
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${orderItemsTable.total_price}), 0)`
    })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId))
      .execute();

    const total = parseFloat(result[0].total);

    // Update the order total
    await db.update(ordersTable)
      .set({ 
        total_amount: total.toString(),
        updated_at: new Date()
      })
      .where(eq(ordersTable.id, orderId))
      .execute();

    return total;
  } catch (error) {
    console.error('Order total calculation failed:', error);
    throw error;
  }
};
