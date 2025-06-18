
import { db } from '../db';
import { inventoryTable, usersTable, productsTable } from '../db/schema';
import { type CreateInventoryInput, type UpdateInventoryInput, type Inventory } from '../schema';
import { eq, and, lte, sql } from 'drizzle-orm';

export const createInventory = async (input: CreateInventoryInput): Promise<Inventory> => {
  try {
    // Verify client exists and is a client role
    const client = await db.select()
      .from(usersTable)
      .where(and(eq(usersTable.id, input.client_id), eq(usersTable.role, 'client')))
      .execute();
    
    if (client.length === 0) {
      throw new Error('Client not found or user is not a client');
    }

    // Verify product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();
    
    if (product.length === 0) {
      throw new Error('Product not found');
    }

    const result = await db.insert(inventoryTable)
      .values({
        client_id: input.client_id,
        product_id: input.product_id,
        quantity: input.quantity,
        warehouse_location: input.warehouse_location
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Inventory creation failed:', error);
    throw error;
  }
};

export const getInventory = async (): Promise<Inventory[]> => {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get inventory failed:', error);
    throw error;
  }
};

export const getInventoryByClient = async (clientId: number): Promise<Inventory[]> => {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.client_id, clientId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get inventory by client failed:', error);
    throw error;
  }
};

export const getInventoryById = async (id: number): Promise<Inventory> => {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error('Inventory not found');
    }

    return results[0];
  } catch (error) {
    console.error('Get inventory by ID failed:', error);
    throw error;
  }
};

export const updateInventory = async (input: UpdateInventoryInput): Promise<Inventory> => {
  try {
    // Check if inventory exists
    const existing = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Inventory not found');
    }

    const updateData: any = {};
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.reserved_quantity !== undefined) updateData.reserved_quantity = input.reserved_quantity;
    if (input.warehouse_location !== undefined) updateData.warehouse_location = input.warehouse_location;
    
    // Always update last_updated timestamp
    updateData.last_updated = new Date();

    const result = await db.update(inventoryTable)
      .set(updateData)
      .where(eq(inventoryTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Update inventory failed:', error);
    throw error;
  }
};

export const deleteInventory = async (id: number): Promise<void> => {
  try {
    const result = await db.delete(inventoryTable)
      .where(eq(inventoryTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Inventory not found');
    }
  } catch (error) {
    console.error('Delete inventory failed:', error);
    throw error;
  }
};

export const getLowStockItems = async (clientId: number, threshold: number = 10): Promise<Inventory[]> => {
  try {
    const results = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.client_id, clientId),
        lte(inventoryTable.quantity, threshold)
      ))
      .execute();

    return results;
  } catch (error) {
    console.error('Get low stock items failed:', error);
    throw error;
  }
};

export const getLowStockItemsCount = async (clientId: number, threshold: number = 10): Promise<number> => {
  try {
    const results = await db.select({
      count: sql<number>`count(*)`
    })
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.client_id, clientId),
        sql`${inventoryTable.quantity} - ${inventoryTable.reserved_quantity} <= ${threshold}`
      ))
      .execute();

    return Number(results[0].count);
  } catch (error) {
    console.error('Get low stock items count failed:', error);
    throw error;
  }
};

export const reserveInventory = async (productId: number, clientId: number, quantity: number): Promise<void> => {
  try {
    // Find inventory record
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.product_id, productId),
        eq(inventoryTable.client_id, clientId)
      ))
      .execute();

    if (inventory.length === 0) {
      throw new Error('Inventory not found for this product and client');
    }

    const availableQuantity = inventory[0].quantity - inventory[0].reserved_quantity;
    if (availableQuantity < quantity) {
      throw new Error('Insufficient inventory available for reservation');
    }

    // Update reserved quantity
    await db.update(inventoryTable)
      .set({ 
        reserved_quantity: inventory[0].reserved_quantity + quantity,
        last_updated: new Date()
      })
      .where(eq(inventoryTable.id, inventory[0].id))
      .execute();
  } catch (error) {
    console.error('Reserve inventory failed:', error);
    throw error;
  }
};

export const releaseInventory = async (productId: number, clientId: number, quantity: number): Promise<void>  => {
  try {
    // Find inventory record
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.product_id, productId),
        eq(inventoryTable.client_id, clientId)
      ))
      .execute();

    if (inventory.length === 0) {
      throw new Error('Inventory not found for this product and client');
    }

    if (inventory[0].reserved_quantity < quantity) {
      throw new Error('Cannot release more inventory than is reserved');
    }

    // Update quantities - remove from both total and reserved
    await db.update(inventoryTable)
      .set({ 
        quantity: inventory[0].quantity - quantity,
        reserved_quantity: inventory[0].reserved_quantity - quantity,
        last_updated: new Date()
      })
      .where(eq(inventoryTable.id, inventory[0].id))
      .execute();
  } catch (error) {
    console.error('Release inventory failed:', error);
    throw error;
  }
};
