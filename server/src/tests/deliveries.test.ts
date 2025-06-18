
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { deliveriesTable, ordersTable, usersTable } from '../db/schema';
import { type CreateDeliveryInput, type UpdateDeliveryInput } from '../schema';
import { 
  createDelivery, 
  getDeliveries, 
  getDeliveryById, 
  getDeliveryByOrder, 
  updateDelivery, 
  getDeliveriesByStatus, 
  trackDelivery 
} from '../handlers/deliveries';
import { eq } from 'drizzle-orm';

describe('deliveries handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create a client user
    const clientResult = await db.insert(usersTable)
      .values({
        email: 'client@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Client',
        role: 'client'
      })
      .returning()
      .execute();

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        client_id: clientResult[0].id,
        order_number: 'ORD-001',
        shipping_address: '123 Test St'
      })
      .returning()
      .execute();

    return {
      client: clientResult[0],
      order: orderResult[0]
    };
  };

  describe('createDelivery', () => {
    it('should create a delivery with all fields', async () => {
      const { order } = await createTestData();
      
      const testInput: CreateDeliveryInput = {
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: new Date('2024-01-15')
      };

      const result = await createDelivery(testInput);

      expect(result.order_id).toEqual(order.id);
      expect(result.tracking_number).toEqual('TRK-001');
      expect(result.carrier).toEqual('UPS');
      expect(result.status).toEqual('pending');
      expect(result.estimated_delivery_date).toBeInstanceOf(Date);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a delivery with minimal fields', async () => {
      const { order } = await createTestData();
      
      const testInput: CreateDeliveryInput = {
        order_id: order.id,
        tracking_number: 'TRK-002',
        carrier: null,
        estimated_delivery_date: null
      };

      const result = await createDelivery(testInput);

      expect(result.order_id).toEqual(order.id);
      expect(result.tracking_number).toEqual('TRK-002');
      expect(result.carrier).toBeNull();
      expect(result.estimated_delivery_date).toBeNull();
      expect(result.status).toEqual('pending');
    });

    it('should save delivery to database', async () => {
      const { order } = await createTestData();
      
      const testInput: CreateDeliveryInput = {
        order_id: order.id,
        tracking_number: 'TRK-003',
        carrier: 'FedEx',
        estimated_delivery_date: new Date('2024-01-20')
      };

      const result = await createDelivery(testInput);

      const deliveries = await db.select()
        .from(deliveriesTable)
        .where(eq(deliveriesTable.id, result.id))
        .execute();

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].tracking_number).toEqual('TRK-003');
      expect(deliveries[0].carrier).toEqual('FedEx');
    });
  });

  describe('getDeliveries', () => {
    it('should return empty array when no deliveries exist', async () => {
      const result = await getDeliveries();
      expect(result).toEqual([]);
    });

    it('should return all deliveries', async () => {
      const { order } = await createTestData();
      
      // Create multiple deliveries
      await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-002',
        carrier: 'FedEx',
        estimated_delivery_date: null
      });

      const result = await getDeliveries();

      expect(result).toHaveLength(2);
      expect(result[0].tracking_number).toBeDefined();
      expect(result[1].tracking_number).toBeDefined();
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery by id', async () => {
      const { order } = await createTestData();
      
      const created = await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const result = await getDeliveryById(created.id);

      expect(result.id).toEqual(created.id);
      expect(result.tracking_number).toEqual('TRK-001');
      expect(result.carrier).toEqual('UPS');
    });

    it('should throw error when delivery not found', async () => {
      expect(getDeliveryById(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('getDeliveryByOrder', () => {
    it('should return delivery by order id', async () => {
      const { order } = await createTestData();
      
      await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const result = await getDeliveryByOrder(order.id);

      expect(result.order_id).toEqual(order.id);
      expect(result.tracking_number).toEqual('TRK-001');
    });

    it('should throw error when delivery for order not found', async () => {
      expect(getDeliveryByOrder(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('updateDelivery', () => {
    it('should update delivery status', async () => {
      const { order } = await createTestData();
      
      const created = await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const updateInput: UpdateDeliveryInput = {
        id: created.id,
        status: 'in_transit'
      };

      const result = await updateDelivery(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.status).toEqual('in_transit');
      expect(result.tracking_number).toEqual('TRK-001'); // Other fields unchanged
    });

    it('should update multiple fields', async () => {
      const { order } = await createTestData();
      
      const created = await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const updateInput: UpdateDeliveryInput = {
        id: created.id,
        status: 'delivered',
        actual_delivery_date: new Date('2024-01-25'),
        delivery_notes: 'Delivered to front door'
      };

      const result = await updateDelivery(updateInput);

      expect(result.status).toEqual('delivered');
      expect(result.actual_delivery_date).toBeInstanceOf(Date);
      expect(result.delivery_notes).toEqual('Delivered to front door');
    });

    it('should throw error when delivery not found', async () => {
      const updateInput: UpdateDeliveryInput = {
        id: 999,
        status: 'delivered'
      };

      expect(updateDelivery(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('getDeliveriesByStatus', () => {
    it('should return deliveries by status', async () => {
      const { order } = await createTestData();
      
      // Create deliveries with different statuses
      const delivery1 = await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-001',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const delivery2 = await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-002',
        carrier: 'FedEx',
        estimated_delivery_date: null
      });

      // Update one to different status
      await updateDelivery({
        id: delivery2.id,
        status: 'in_transit'
      });

      const pendingDeliveries = await getDeliveriesByStatus('pending');
      const inTransitDeliveries = await getDeliveriesByStatus('in_transit');

      expect(pendingDeliveries).toHaveLength(1);
      expect(pendingDeliveries[0].id).toEqual(delivery1.id);
      
      expect(inTransitDeliveries).toHaveLength(1);
      expect(inTransitDeliveries[0].id).toEqual(delivery2.id);
    });

    it('should return empty array for status with no deliveries', async () => {
      const result = await getDeliveriesByStatus('delivered');
      expect(result).toEqual([]);
    });
  });

  describe('trackDelivery', () => {
    it('should return delivery by tracking number', async () => {
      const { order } = await createTestData();
      
      await createDelivery({
        order_id: order.id,
        tracking_number: 'TRK-123456',
        carrier: 'UPS',
        estimated_delivery_date: null
      });

      const result = await trackDelivery('TRK-123456');

      expect(result.tracking_number).toEqual('TRK-123456');
      expect(result.carrier).toEqual('UPS');
    });

    it('should throw error when tracking number not found', async () => {
      expect(trackDelivery('INVALID-TRK')).rejects.toThrow(/not found/i);
    });
  });
});
