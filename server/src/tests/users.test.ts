
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable, inventoryTable, deliveriesTable, productsTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getClientUsers,
  getClientDashboardStats,
  getAdminDashboardStats
} from '../handlers/users';
import { eq } from 'drizzle-orm';

const testClientInput: CreateUserInput = {
  email: 'client@test.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'client',
  company_name: 'Test Corp',
  phone: '555-1234',
  address: '123 Test St'
};

const testAdminInput: CreateUserInput = {
  email: 'admin@test.com',
  password: 'password123',
  first_name: 'Jane',
  last_name: 'Admin',
  role: 'admin',
  company_name: null,
  phone: null,
  address: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a client user', async () => {
    const result = await createUser(testClientInput);

    expect(result.email).toEqual('client@test.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('client');
    expect(result.company_name).toEqual('Test Corp');
    expect(result.phone).toEqual('555-1234');
    expect(result.address).toEqual('123 Test St');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    expect(result.email).toEqual('admin@test.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Admin');
    expect(result.role).toEqual('admin');
    expect(result.company_name).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('should save user to database', async () => {
    const result = await createUser(testClientInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('client@test.com');
    expect(users[0].role).toEqual('client');
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toHaveLength(0);
  });

  it('should return all users', async () => {
    await createUser(testClientInput);
    await createUser(testAdminInput);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result.find(u => u.email === 'client@test.com')).toBeDefined();
    expect(result.find(u => u.email === 'admin@test.com')).toBeDefined();
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by id', async () => {
    const created = await createUser(testClientInput);
    const result = await getUserById(created.id);

    expect(result.id).toEqual(created.id);
    expect(result.email).toEqual('client@test.com');
    expect(result.first_name).toEqual('John');
  });

  it('should throw error when user not found', async () => {
    await expect(getUserById(999)).rejects.toThrow(/not found/i);
  });
});

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user fields', async () => {
    const created = await createUser(testClientInput);

    const updateInput: UpdateUserInput = {
      id: created.id,
      first_name: 'Johnny',
      company_name: 'Updated Corp',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.first_name).toEqual('Johnny');
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.company_name).toEqual('Updated Corp');
    expect(result.is_active).toBe(false);
  });

  it('should update only provided fields', async () => {
    const created = await createUser(testClientInput);

    const updateInput: UpdateUserInput = {
      id: created.id,
      email: 'newemail@test.com'
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual('newemail@test.com');
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.company_name).toEqual('Test Corp'); // Unchanged
  });

  it('should throw error when user not found', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      first_name: 'Test'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
  });
});

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete user', async () => {
    const created = await createUser(testClientInput);

    await deleteUser(created.id);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, created.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should throw error when user not found', async () => {
    await expect(deleteUser(999)).rejects.toThrow(/not found/i);
  });
});

describe('getClientUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only client users', async () => {
    await createUser(testClientInput);
    await createUser(testAdminInput);
    
    const secondClient = {
      ...testClientInput,
      email: 'client2@test.com'
    };
    await createUser(secondClient);

    const result = await getClientUsers();

    expect(result).toHaveLength(2);
    expect(result.every(u => u.role === 'client')).toBe(true);
    expect(result.find(u => u.email === 'client@test.com')).toBeDefined();
    expect(result.find(u => u.email === 'client2@test.com')).toBeDefined();
  });

  it('should return empty array when no clients exist', async () => {
    await createUser(testAdminInput);

    const result = await getClientUsers();

    expect(result).toHaveLength(0);
  });
});

describe('getClientDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for client with no data', async () => {
    const client = await createUser(testClientInput);

    const result = await getClientDashboardStats(client.id);

    expect(result.totalOrders).toEqual(0);
    expect(result.pendingOrders).toEqual(0);
    expect(result.deliveredOrders).toEqual(0);
    expect(result.totalRevenue).toEqual(0);
    expect(result.lowStockItems).toEqual(0);
  });

  it('should calculate stats correctly with orders and inventory', async () => {
    const client = await createUser(testClientInput);

    // Create product for inventory
    const product = await db.insert(productsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product',
        unit_price: '10.00',
        weight: '1.00',
        dimensions: '10x10x10'
      })
      .returning()
      .execute();

    // Create orders with different statuses
    const pendingOrder = await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '100.00',
        shipping_address: '123 Test St'
      })
      .returning()
      .execute();

    const shippedOrder = await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-002',
        status: 'shipped',
        total_amount: '200.00',
        shipping_address: '123 Test St'
      })
      .returning()
      .execute();

    const deliveredOrder = await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-003',
        status: 'delivered',
        total_amount: '150.00',
        shipping_address: '123 Test St'
      })
      .returning()
      .execute();

    // Create inventory with low stock
    await db.insert(inventoryTable)
      .values({
        client_id: client.id,
        product_id: product[0].id,
        quantity: 5, // Low stock (< 10)
        warehouse_location: 'A1'
      })
      .execute();

    const result = await getClientDashboardStats(client.id);

    expect(result.totalOrders).toEqual(3);
    expect(result.pendingOrders).toEqual(1);
    expect(result.deliveredOrders).toEqual(1);
    expect(result.totalRevenue).toEqual(350.00); // 200 + 150 (shipped + delivered)
    expect(result.lowStockItems).toEqual(1);
  });

  it('should only count revenue from shipped and delivered orders', async () => {
    const client = await createUser(testClientInput);

    // Create orders with different statuses
    await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '100.00',
        shipping_address: '123 Test St'
      })
      .execute();

    await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-002',
        status: 'cancelled',
        total_amount: '200.00',
        shipping_address: '123 Test St'
      })
      .execute();

    await db.insert(ordersTable)
      .values({
        client_id: client.id,
        order_number: 'ORD-003',
        status: 'shipped',
        total_amount: '50.00',
        shipping_address: '123 Test St'
      })
      .execute();

    const result = await getClientDashboardStats(client.id);

    expect(result.totalOrders).toEqual(3);
    expect(result.totalRevenue).toEqual(50.00); // Only shipped order
  });
});

describe('getAdminDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const result = await getAdminDashboardStats();

    expect(result.totalClients).toEqual(0);
    expect(result.totalOrders).toEqual(0);
    expect(result.totalRevenue).toEqual(0);
    expect(result.pendingDeliveries).toEqual(0);
    expect(result.totalProducts).toEqual(0);
  });

  it('should calculate admin stats correctly', async () => {
    // Create clients and admin
    const client1 = await createUser(testClientInput);
    const client2 = await createUser({
      ...testClientInput,
      email: 'client2@test.com'
    });
    await createUser(testAdminInput); // Admin shouldn't be counted

    // Create products
    const product = await db.insert(productsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product',
        unit_price: '10.00'
      })
      .returning()
      .execute();

    // Create orders
    const order1 = await db.insert(ordersTable)
      .values({
        client_id: client1.id,
        order_number: 'ORD-001',
        status: 'delivered',
        total_amount: '100.00',
        shipping_address: '123 Test St'
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        client_id: client2.id,
        order_number: 'ORD-002',
        status: 'pending',
        total_amount: '200.00',
        shipping_address: '456 Test Ave'
      })
      .returning()
      .execute();

    // Create deliveries
    await db.insert(deliveriesTable)
      .values({
        order_id: order1[0].id,
        tracking_number: 'TRK-001',
        status: 'delivered'
      })
      .execute();

    await db.insert(deliveriesTable)
      .values({
        order_id: order2[0].id,
        tracking_number: 'TRK-002',
        status: 'pending'
      })
      .execute();

    const result = await getAdminDashboardStats();

    expect(result.totalClients).toEqual(2); // Only clients, not admin
    expect(result.totalOrders).toEqual(2);
    expect(result.totalRevenue).toEqual(300.00); // All orders
    expect(result.pendingDeliveries).toEqual(1);
    expect(result.totalProducts).toEqual(1);
  });
});
