
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, ordersTable, inventoryTable, deliveriesTable } from '../db/schema';
import {
  getClientDashboardStats,
  getAdminDashboardStats,
  getRevenueByClient,
  getTotalSystemRevenue,
  getOrderStatusCounts,
  getDeliveryStatusCounts
} from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helpers
  const createTestClient = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'client@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Client',
        role: 'client',
        company_name: 'Test Company',
        phone: '555-0123',
        address: '123 Test St'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestAdmin = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'admin'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestProduct = async () => {
    const result = await db.insert(productsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        unit_price: '19.99',
        weight: '1.5',
        dimensions: '10x10x10'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestOrder = async (clientId: number, status: string, totalAmount: string) => {
    const result = await db.insert(ordersTable)
      .values({
        client_id: clientId,
        order_number: `ORD-${Date.now()}-${Math.random()}`,
        status: status as any,
        total_amount: totalAmount,
        shipping_address: '456 Ship St',
        billing_address: '789 Bill Ave'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestInventory = async (clientId: number, productId: number, quantity: number, reserved: number = 0) => {
    const result = await db.insert(inventoryTable)
      .values({
        client_id: clientId,
        product_id: productId,
        quantity,
        reserved_quantity: reserved,
        warehouse_location: 'A1'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestDelivery = async (orderId: number, status: string = 'pending') => {
    const result = await db.insert(deliveriesTable)
      .values({
        order_id: orderId,
        tracking_number: `TRK-${Date.now()}-${Math.random()}`,
        status: status as any,
        carrier: 'Test Carrier'
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('getClientDashboardStats', () => {
    it('should return correct stats for client with orders', async () => {
      const client = await createTestClient();
      const product = await createTestProduct();

      // Create orders with different statuses
      await createTestOrder(client.id, 'pending', '100.00');
      await createTestOrder(client.id, 'delivered', '200.00');
      await createTestOrder(client.id, 'shipped', '150.00');
      await createTestOrder(client.id, 'cancelled', '75.00');

      // Create inventory items - some low stock
      await createTestInventory(client.id, product.id, 5, 0); // Available: 5 (low stock)
      await createTestInventory(client.id, product.id, 20, 5); // Available: 15 (not low stock)
      await createTestInventory(client.id, product.id, 8, 3); // Available: 5 (low stock)

      const stats = await getClientDashboardStats(client.id);

      expect(stats.totalOrders).toBe(4);
      expect(stats.pendingOrders).toBe(1);
      expect(stats.deliveredOrders).toBe(1);
      expect(stats.totalRevenue).toBe(350.00); // Only shipped + delivered orders (200 + 150)
      expect(stats.lowStockItems).toBe(2); // Two items with available quantity <= 10
    });

    it('should return zero stats for client with no data', async () => {
      const client = await createTestClient();

      const stats = await getClientDashboardStats(client.id);

      expect(stats.totalOrders).toBe(0);
      expect(stats.pendingOrders).toBe(0);
      expect(stats.deliveredOrders).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.lowStockItems).toBe(0);
    });

    it('should only include shipped and delivered orders in revenue calculation', async () => {
      const client = await createTestClient();

      // Create orders with different statuses
      await createTestOrder(client.id, 'pending', '100.00');
      await createTestOrder(client.id, 'confirmed', '200.00');
      await createTestOrder(client.id, 'processing', '150.00');
      await createTestOrder(client.id, 'shipped', '300.00');
      await createTestOrder(client.id, 'delivered', '250.00');
      await createTestOrder(client.id, 'cancelled', '75.00');

      const stats = await getClientDashboardStats(client.id);

      expect(stats.totalOrders).toBe(6);
      expect(stats.totalRevenue).toBe(550.00); // Only shipped (300) + delivered (250)
    });

    it('should correctly identify low stock items', async () => {
      const client = await createTestClient();
      const product = await createTestProduct();

      // Create inventory with different available quantities
      await createTestInventory(client.id, product.id, 15, 5); // Available: 10 (low stock - exactly at threshold)
      await createTestInventory(client.id, product.id, 12, 5); // Available: 7 (low stock)
      await createTestInventory(client.id, product.id, 20, 5); // Available: 15 (not low stock)
      await createTestInventory(client.id, product.id, 5, 0); // Available: 5 (low stock)

      const stats = await getClientDashboardStats(client.id);

      expect(stats.lowStockItems).toBe(3); // Three items with available quantity <= 10
    });
  });

  describe('getAdminDashboardStats', () => {
    it('should return correct stats for admin dashboard', async () => {
      const client1 = await createTestClient();
      const client2 = await db.insert(usersTable)
        .values({
          email: 'client2@test.com',
          password_hash: 'hash123',
          first_name: 'Client',
          last_name: 'Two',
          role: 'client'
        })
        .returning()
        .execute();
      
      const admin = await createTestAdmin();
      const product = await createTestProduct();

      // Create orders
      const order1 = await createTestOrder(client1.id, 'delivered', '100.00');
      const order2 = await createTestOrder(client2[0].id, 'pending', '200.00');

      // Create deliveries
      await createTestDelivery(order1.id, 'pending');
      await createTestDelivery(order2.id, 'delivered');

      const stats = await getAdminDashboardStats();

      expect(stats.totalClients).toBe(2); // Only clients, not admin
      expect(stats.totalOrders).toBe(2);
      expect(stats.totalRevenue).toBe(300.00); // All orders regardless of status
      expect(stats.pendingDeliveries).toBe(1);
      expect(stats.totalProducts).toBe(1);
    });

    it('should return zero stats when no data exists', async () => {
      const stats = await getAdminDashboardStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.totalOrders).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.pendingDeliveries).toBe(0);
      expect(stats.totalProducts).toBe(0);
    });

    it('should only count clients in totalClients, not admins', async () => {
      await createTestClient();
      await createTestAdmin();
      await db.insert(usersTable)
        .values({
          email: 'admin2@test.com',
          password_hash: 'hash123',
          first_name: 'Admin',
          last_name: 'Two',
          role: 'admin'
        })
        .execute();

      const stats = await getAdminDashboardStats();

      expect(stats.totalClients).toBe(1); // Only the client
    });
  });

  describe('getRevenueByClient', () => {
    it('should return total revenue for specific client', async () => {
      const client1 = await createTestClient();
      const client2 = await db.insert(usersTable)
        .values({
          email: 'client2@test.com',
          password_hash: 'hash123',
          first_name: 'Client',
          last_name: 'Two',
          role: 'client'
        })
        .returning()
        .execute();

      // Create orders for both clients
      await createTestOrder(client1.id, 'delivered', '100.00');
      await createTestOrder(client1.id, 'pending', '200.00');
      await createTestOrder(client2[0].id, 'delivered', '300.00');

      const client1Revenue = await getRevenueByClient(client1.id);
      const client2Revenue = await getRevenueByClient(client2[0].id);

      expect(client1Revenue).toBe(300.00); // All orders regardless of status
      expect(client2Revenue).toBe(300.00);
    });

    it('should return 0 for client with no orders', async () => {
      const client = await createTestClient();

      const revenue = await getRevenueByClient(client.id);

      expect(revenue).toBe(0);
    });
  });

  describe('getTotalSystemRevenue', () => {
    it('should return total revenue across all orders', async () => {
      const client1 = await createTestClient();
      const client2 = await db.insert(usersTable)
        .values({
          email: 'client2@test.com',
          password_hash: 'hash123',
          first_name: 'Client',
          last_name: 'Two',
          role: 'client'
        })
        .returning()
        .execute();

      await createTestOrder(client1.id, 'delivered', '100.00');
      await createTestOrder(client1.id, 'pending', '200.00');
      await createTestOrder(client2[0].id, 'cancelled', '150.00');

      const totalRevenue = await getTotalSystemRevenue();

      expect(totalRevenue).toBe(450.00); // Sum of all orders
    });

    it('should return 0 when no orders exist', async () => {
      const totalRevenue = await getTotalSystemRevenue();

      expect(totalRevenue).toBe(0);
    });
  });

  describe('getOrderStatusCounts', () => {
    it('should return status counts for specific client', async () => {
      const client1 = await createTestClient();
      const client2 = await db.insert(usersTable)
        .values({
          email: 'client2@test.com',
          password_hash: 'hash123',
          first_name: 'Client',
          last_name: 'Two',
          role: 'client'
        })
        .returning()
        .execute();

      // Create orders for client1
      await createTestOrder(client1.id, 'pending', '100.00');
      await createTestOrder(client1.id, 'pending', '200.00');
      await createTestOrder(client1.id, 'delivered', '150.00');

      // Create orders for client2 (should not be included)
      await createTestOrder(client2[0].id, 'pending', '300.00');

      const statusCounts = await getOrderStatusCounts(client1.id);

      expect(statusCounts['pending']).toBe(2);
      expect(statusCounts['delivered']).toBe(1);
      expect(statusCounts['shipped']).toBeUndefined(); // No shipped orders
    });

    it('should return status counts for all orders when no clientId provided', async () => {
      const client1 = await createTestClient();
      const client2 = await db.insert(usersTable)
        .values({
          email: 'client2@test.com',
          password_hash: 'hash123',
          first_name: 'Client',
          last_name: 'Two',
          role: 'client'
        })
        .returning()
        .execute();

      await createTestOrder(client1.id, 'pending', '100.00');
      await createTestOrder(client1.id, 'delivered', '200.00');
      await createTestOrder(client2[0].id, 'pending', '150.00');
      await createTestOrder(client2[0].id, 'shipped', '75.00');

      const statusCounts = await getOrderStatusCounts();

      expect(statusCounts['pending']).toBe(2);
      expect(statusCounts['delivered']).toBe(1);
      expect(statusCounts['shipped']).toBe(1);
    });

    it('should return empty object when no orders exist', async () => {
      const statusCounts = await getOrderStatusCounts();

      expect(statusCounts).toEqual({});
    });
  });

  describe('getDeliveryStatusCounts', () => {
    it('should return delivery status counts', async () => {
      const client = await createTestClient();
      const order1 = await createTestOrder(client.id, 'shipped', '100.00');
      const order2 = await createTestOrder(client.id, 'shipped', '200.00');
      const order3 = await createTestOrder(client.id, 'delivered', '150.00');

      await createTestDelivery(order1.id, 'pending');
      await createTestDelivery(order2.id, 'pending');
      await createTestDelivery(order3.id, 'delivered');

      const statusCounts = await getDeliveryStatusCounts();

      expect(statusCounts['pending']).toBe(2);
      expect(statusCounts['delivered']).toBe(1);
      expect(statusCounts['in_transit']).toBeUndefined(); // No in_transit deliveries
    });

    it('should return empty object when no deliveries exist', async () => {
      const statusCounts = await getDeliveryStatusCounts();

      expect(statusCounts).toEqual({});
    });
  });
});
