
import { db } from '../db';
import { deliveriesTable } from '../db/schema';
import { type CreateDeliveryInput, type UpdateDeliveryInput, type Delivery } from '../schema';
import { eq } from 'drizzle-orm';

export const createDelivery = async (input: CreateDeliveryInput): Promise<Delivery> => {
  try {
    const result = await db.insert(deliveriesTable)
      .values({
        order_id: input.order_id,
        tracking_number: input.tracking_number,
        carrier: input.carrier,
        estimated_delivery_date: input.estimated_delivery_date
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Delivery creation failed:', error);
    throw error;
  }
};

export const getDeliveries = async (): Promise<Delivery[]> => {
  try {
    const results = await db.select()
      .from(deliveriesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    throw error;
  }
};

export const getDeliveryById = async (id: number): Promise<Delivery> => {
  try {
    const results = await db.select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Delivery with id ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to fetch delivery by id:', error);
    throw error;
  }
};

export const getDeliveryByOrder = async (orderId: number): Promise<Delivery> => {
  try {
    const results = await db.select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.order_id, orderId))
      .execute();

    if (results.length === 0) {
      throw new Error(`Delivery for order ${orderId} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to fetch delivery by order:', error);
    throw error;
  }
};

export const updateDelivery = async (input: UpdateDeliveryInput): Promise<Delivery> => {
  try {
    const updateData: any = {};
    
    if (input.status !== undefined) updateData.status = input.status;
    if (input.carrier !== undefined) updateData.carrier = input.carrier;
    if (input.estimated_delivery_date !== undefined) updateData.estimated_delivery_date = input.estimated_delivery_date;
    if (input.actual_delivery_date !== undefined) updateData.actual_delivery_date = input.actual_delivery_date;
    if (input.delivery_notes !== undefined) updateData.delivery_notes = input.delivery_notes;

    const result = await db.update(deliveriesTable)
      .set(updateData)
      .where(eq(deliveriesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Delivery with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Delivery update failed:', error);
    throw error;
  }
};

export const getDeliveriesByStatus = async (status: string): Promise<Delivery[]> => {
  try {
    const results = await db.select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.status, status as any))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch deliveries by status:', error);
    throw error;
  }
};

export const trackDelivery = async (trackingNumber: string): Promise<Delivery> => {
  try {
    const results = await db.select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.tracking_number, trackingNumber))
      .execute();

    if (results.length === 0) {
      throw new Error(`Delivery with tracking number ${trackingNumber} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to track delivery:', error);
    throw error;
  }
};
