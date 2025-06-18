
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, ordersTable, orderItemsTable } from '../db/schema';
import { 
  type CreateOrderInput, 
  type UpdateOrderInput, 
  type CreateOrderItemInput,
  type OrderStatus
} from '../schema';
import { 
  createOrder, 
  getOrders, 
  getOrdersByClient, 
  getOrderById, 
  updateOrder, 
  deleteOrder,
  addOrderItem,
  getOrderItems,
  removeOrderItem,
  calculateOrderTotal
} from '../handlers/orders';
import { eq } from 'drizzle-orm';

// Test data
const testClient = {
  email: 'client@test.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'Client',
  role: 'client' as const,
  company_name: 'Test Company',
  phone: '123-456-7890',
  address: '123 Test St'
};

const testProduct = {
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'A test product',
  unit_price: '99.99',
  weight: '1.5',
  dimensions: '10x10x10'
};

const testOrderInput: CreateOrderInput = {
  client_id: 1, // Will be set after client creation
  shipping_address: '123 Shipping St, Test City, TC 12345',
  billing_address: '456 Billing Ave, Test City, TC 12345',
  notes: 'Test order notes'
};

describe('Order Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createOrder', () => {
    it('should create an order', async () => {
      // Create client first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const result = await createOrder(orderInput);

      expect(result.client_id).toBe(client.id);
      expect(result.shipping_address).toBe(orderInput.shipping_address);
      expect(result.billing_address).toBe(orderInput.billing_address);
      expect(result.notes).toBe(orderInput.notes);
      expect(result.status).toBe('pending');
      expect(result.total_amount).toBe(0);
      expect(typeof result.total_amount).toBe('number');
      expect(result.order_number).toMatch(/^ORD-\d+-[A-Z0-9]{9}$/);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save order to database', async () => {
      // Create client first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const result = await createOrder(orderInput);

      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, result.id))
        .execute();

      expect(orders).toHaveLength(1);
      expect(orders[0].client_id).toBe(client.id);
      expect(orders[0].shipping_address).toBe(orderInput.shipping_address);
      expect(parseFloat(orders[0].total_amount)).toBe(0);
    });

    it('should throw error for non-existent client', async () => {
      const orderInput = { ...testOrderInput, client_id: 999 };
      
      await expect(createOrder(orderInput)).rejects.toThrow(/client not found/i);
    });
  });

  describe('getOrders', () => {
    it('should return all orders', async () => {
      // Create client first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      // Create two orders
      const orderInput1 = { ...testOrderInput, client_id: client.id };
      const orderInput2 = { 
        ...testOrderInput, 
        client_id: client.id,
        shipping_address: '789 Different St, Test City, TC 12345'
      };

      await createOrder(orderInput1);
      await createOrder(orderInput2);

      const results = await getOrders();

      expect(results).toHaveLength(2);
      expect(results[0].total_amount).toBe(0);
      expect(typeof results[0].total_amount).toBe('number');
      expect(results[1].total_amount).toBe(0);
      expect(typeof results[1].total_amount).toBe('number');
    });

    it('should return empty array when no orders exist', async () => {
      const results = await getOrders();
      expect(results).toHaveLength(0);
    });
  });

  describe('getOrdersByClient', () => {
    it('should return orders for specific client', async () => {
      // Create two clients
      const client1Result = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client1 = client1Result[0];

      const client2Result = await db.insert(usersTable)
        .values({
          ...testClient,
          email: 'client2@test.com',
          company_name: 'Test Company 2'
        })
        .returning()
        .execute();
      const client2 = client2Result[0];

      // Create orders for both clients
      await createOrder({ ...testOrderInput, client_id: client1.id });
      await createOrder({ ...testOrderInput, client_id: client1.id });
      await createOrder({ ...testOrderInput, client_id: client2.id });

      const client1Orders = await getOrdersByClient(client1.id);
      const client2Orders = await getOrdersByClient(client2.id);

      expect(client1Orders).toHaveLength(2);
      expect(client2Orders).toHaveLength(1);
      expect(client1Orders[0].client_id).toBe(client1.id);
      expect(client2Orders[0].client_id).toBe(client2.id);
    });
  });

  describe('getOrderById', () => {
    it('should return specific order', async () => {
      // Create client first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const result = await getOrderById(createdOrder.id);

      expect(result.id).toBe(createdOrder.id);
      expect(result.client_id).toBe(client.id);
      expect(result.shipping_address).toBe(orderInput.shipping_address);
      expect(typeof result.total_amount).toBe('number');
    });

    it('should throw error for non-existent order', async () => {
      await expect(getOrderById(999)).rejects.toThrow(/order not found/i);
    });
  });

  describe('updateOrder', () => {
    it('should update order status', async () => {
      // Create client and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const updateInput: UpdateOrderInput = {
        id: createdOrder.id,
        status: 'confirmed' as OrderStatus
      };

      const result = await updateOrder(updateInput);

      expect(result.id).toBe(createdOrder.id);
      expect(result.status).toBe('confirmed');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update shipping address', async () => {
      // Create client and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const newAddress = '999 New Address St, New City, NC 54321';
      const updateInput: UpdateOrderInput = {
        id: createdOrder.id,
        shipping_address: newAddress
      };

      const result = await updateOrder(updateInput);

      expect(result.shipping_address).toBe(newAddress);
    });

    it('should throw error for non-existent order', async () => {
      const updateInput: UpdateOrderInput = {
        id: 999,
        status: 'confirmed' as OrderStatus
      };

      await expect(updateOrder(updateInput)).rejects.toThrow(/order not found/i);
    });
  });

  describe('deleteOrder', () => {
    it('should delete order and its items', async () => {
      // Create client, product, and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const productResult = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product = productResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      // Add order item
      const orderItemInput: CreateOrderItemInput = {
        order_id: createdOrder.id,
        product_id: product.id,
        quantity: 2,
        unit_price: 99.99
      };
      await addOrderItem(orderItemInput);

      // Delete order
      await deleteOrder(createdOrder.id);

      // Verify order and items are deleted
      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, createdOrder.id))
        .execute();

      const items = await db.select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.order_id, createdOrder.id))
        .execute();

      expect(orders).toHaveLength(0);
      expect(items).toHaveLength(0);
    });

    it('should throw error for non-existent order', async () => {
      await expect(deleteOrder(999)).rejects.toThrow(/order not found/i);
    });
  });

  describe('addOrderItem', () => {
    it('should add item to order and update total', async () => {
      // Create client, product, and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const productResult = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product = productResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const orderItemInput: CreateOrderItemInput = {
        order_id: createdOrder.id,
        product_id: product.id,
        quantity: 2,
        unit_price: 99.99
      };

      const result = await addOrderItem(orderItemInput);

      expect(result.order_id).toBe(createdOrder.id);
      expect(result.product_id).toBe(product.id);
      expect(result.quantity).toBe(2);
      expect(result.unit_price).toBe(99.99);
      expect(result.total_price).toBe(199.98);
      expect(typeof result.unit_price).toBe('number');
      expect(typeof result.total_price).toBe('number');

      // Verify order total was updated
      const updatedOrder = await getOrderById(createdOrder.id);
      expect(updatedOrder.total_amount).toBe(199.98);
    });

    it('should throw error for non-existent order', async () => {
      const productResult = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product = productResult[0];

      const orderItemInput: CreateOrderItemInput = {
        order_id: 999,
        product_id: product.id,
        quantity: 1,
        unit_price: 99.99
      };

      await expect(addOrderItem(orderItemInput)).rejects.toThrow(/order not found/i);
    });

    it('should throw error for non-existent product', async () => {
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const orderItemInput: CreateOrderItemInput = {
        order_id: createdOrder.id,
        product_id: 999,
        quantity: 1,
        unit_price: 99.99
      };

      await expect(addOrderItem(orderItemInput)).rejects.toThrow(/product not found/i);
    });
  });

  describe('getOrderItems', () => {
    it('should return all items for an order', async () => {
      // Create client, products, and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const product1Result = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product1 = product1Result[0];

      const product2Result = await db.insert(productsTable)
        .values({
          ...testProduct,
          sku: 'TEST-002',
          name: 'Test Product 2'
        })
        .returning()
        .execute();
      const product2 = product2Result[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      // Add two items
      await addOrderItem({
        order_id: createdOrder.id,
        product_id: product1.id,
        quantity: 2,
        unit_price: 99.99
      });
      await addOrderItem({
        order_id: createdOrder.id,
        product_id: product2.id,
        quantity: 1,
        unit_price: 149.99
      });

      const results = await getOrderItems(createdOrder.id);

      expect(results).toHaveLength(2);
      expect(results[0].order_id).toBe(createdOrder.id);
      expect(results[1].order_id).toBe(createdOrder.id);
      expect(typeof results[0].unit_price).toBe('number');
      expect(typeof results[0].total_price).toBe('number');
    });
  });

  describe('removeOrderItem', () => {
    it('should remove item and update order total', async () => {
      // Create client, products, and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const product1Result = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product1 = product1Result[0];

      const product2Result = await db.insert(productsTable)
        .values({
          ...testProduct,
          sku: 'TEST-002',
          name: 'Test Product 2'
        })
        .returning()
        .execute();
      const product2 = product2Result[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      // Add two items
      const item1 = await addOrderItem({
        order_id: createdOrder.id,
        product_id: product1.id,
        quantity: 2,
        unit_price: 99.99
      });
      await addOrderItem({
        order_id: createdOrder.id,
        product_id: product2.id,
        quantity: 1,
        unit_price: 149.99
      });

      // Remove first item
      await removeOrderItem(item1.id);

      // Verify item is removed and total updated
      const remainingItems = await getOrderItems(createdOrder.id);
      expect(remainingItems).toHaveLength(1);
      expect(remainingItems[0].product_id).toBe(product2.id);

      const updatedOrder = await getOrderById(createdOrder.id);
      expect(updatedOrder.total_amount).toBe(149.99);
    });

    it('should throw error for non-existent order item', async () => {
      await expect(removeOrderItem(999)).rejects.toThrow(/order item not found/i);
    });
  });

  describe('calculateOrderTotal', () => {
    it('should calculate correct total for multiple items', async () => {
      // Create client, products, and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const product1Result = await db.insert(productsTable)
        .values(testProduct)
        .returning()
        .execute();
      const product1 = product1Result[0];

      const product2Result = await db.insert(productsTable)
        .values({
          ...testProduct,
          sku: 'TEST-002',
          name: 'Test Product 2'
        })
        .returning()
        .execute();
      const product2 = product2Result[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      // Add items directly to test calculation
      await db.insert(orderItemsTable)
        .values([
          {
            order_id: createdOrder.id,
            product_id: product1.id,
            quantity: 2,
            unit_price: '99.99',
            total_price: '199.98'
          },
          {
            order_id: createdOrder.id,
            product_id: product2.id,
            quantity: 3,
            unit_price: '50.00',
            total_price: '150.00'
          }
        ])
        .execute();

      const total = await calculateOrderTotal(createdOrder.id);

      expect(total).toBe(349.98);

      // Verify order was updated
      const updatedOrder = await getOrderById(createdOrder.id);
      expect(updatedOrder.total_amount).toBe(349.98);
    });

    it('should return 0 for order with no items', async () => {
      // Create client and order first
      const clientResult = await db.insert(usersTable)
        .values(testClient)
        .returning()
        .execute();
      const client = clientResult[0];

      const orderInput = { ...testOrderInput, client_id: client.id };
      const createdOrder = await createOrder(orderInput);

      const total = await calculateOrderTotal(createdOrder.id);

      expect(total).toBe(0);
    });
  });
});
