
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryTable, usersTable, productsTable } from '../db/schema';
import { type CreateInventoryInput, type UpdateInventoryInput } from '../schema';
import { 
  createInventory, 
  getInventory, 
  getInventoryByClient, 
  getInventoryById, 
  updateInventory, 
  deleteInventory, 
  getLowStockItems,
  getLowStockItemsCount,
  reserveInventory,
  releaseInventory
} from '../handlers/inventory';
import { eq, and } from 'drizzle-orm';

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
  unit_price: '19.99',
  weight: '1.50',
  dimensions: '10x10x10'
};

const testInventoryInput: CreateInventoryInput = {
  client_id: 1,
  product_id: 1,
  quantity: 100,
  warehouse_location: 'A1-B2-C3'
};

describe('Inventory Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createInventory', () => {
    it('should create inventory successfully', async () => {
      // Create prerequisite client and product
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };

      const result = await createInventory(input);

      expect(result.client_id).toEqual(clientResult[0].id);
      expect(result.product_id).toEqual(productResult[0].id);
      expect(result.quantity).toEqual(100);
      expect(result.reserved_quantity).toEqual(0);
      expect(result.warehouse_location).toEqual('A1-B2-C3');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error if client not found', async () => {
      const input = {
        ...testInventoryInput,
        client_id: 999
      };

      await expect(createInventory(input)).rejects.toThrow(/client not found/i);
    });

    it('should throw error if product not found', async () => {
      // Create only client
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: 999
      };

      await expect(createInventory(input)).rejects.toThrow(/product not found/i);
    });

    it('should throw error if user is not a client', async () => {
      // Create admin user
      const adminUser = { ...testClient, role: 'admin' as const };
      const adminResult = await db.insert(usersTable).values(adminUser).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      const input = {
        ...testInventoryInput,
        client_id: adminResult[0].id,
        product_id: productResult[0].id
      };

      await expect(createInventory(input)).rejects.toThrow(/client not found/i);
    });
  });

  describe('getInventory', () => {
    it('should return all inventory items', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      await createInventory(input);

      const results = await getInventory();

      expect(results).toHaveLength(1);
      expect(results[0].client_id).toEqual(clientResult[0].id);
      expect(results[0].product_id).toEqual(productResult[0].id);
      expect(results[0].quantity).toEqual(100);
    });

    it('should return empty array when no inventory exists', async () => {
      const results = await getInventory();
      expect(results).toHaveLength(0);
    });
  });

  describe('getInventoryByClient', () => {
    it('should return inventory for specific client', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      await createInventory(input);

      const results = await getInventoryByClient(clientResult[0].id);

      expect(results).toHaveLength(1);
      expect(results[0].client_id).toEqual(clientResult[0].id);
    });

    it('should return empty array for client with no inventory', async () => {
      const results = await getInventoryByClient(999);
      expect(results).toHaveLength(0);
    });
  });

  describe('getInventoryById', () => {
    it('should return inventory by ID', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      const result = await getInventoryById(inventory.id);

      expect(result.id).toEqual(inventory.id);
      expect(result.client_id).toEqual(clientResult[0].id);
      expect(result.product_id).toEqual(productResult[0].id);
    });

    it('should throw error when inventory not found', async () => {
      await expect(getInventoryById(999)).rejects.toThrow(/inventory not found/i);
    });
  });

  describe('updateInventory', () => {
    it('should update inventory quantity', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      const updateInput: UpdateInventoryInput = {
        id: inventory.id,
        quantity: 150
      };

      const result = await updateInventory(updateInput);

      expect(result.quantity).toEqual(150);
      expect(result.last_updated).toBeInstanceOf(Date);
    });

    it('should update warehouse location', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      const updateInput: UpdateInventoryInput = {
        id: inventory.id,
        warehouse_location: 'D4-E5-F6'
      };

      const result = await updateInventory(updateInput);

      expect(result.warehouse_location).toEqual('D4-E5-F6');
    });

    it('should throw error when inventory not found', async () => {
      const updateInput: UpdateInventoryInput = {
        id: 999,
        quantity: 150
      };

      await expect(updateInventory(updateInput)).rejects.toThrow(/inventory not found/i);
    });
  });

  describe('deleteInventory', () => {
    it('should delete inventory successfully', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      await deleteInventory(inventory.id);

      // Verify deletion
      const results = await db.select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, inventory.id))
        .execute();

      expect(results).toHaveLength(0);
    });

    it('should throw error when inventory not found', async () => {
      await expect(deleteInventory(999)).rejects.toThrow(/inventory not found/i);
    });
  });

  describe('getLowStockItems', () => {
    it('should return items with low stock', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create low stock item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id,
        quantity: 5
      };
      await createInventory(input);

      const results = await getLowStockItems(clientResult[0].id, 10);

      expect(results).toHaveLength(1);
      expect(results[0].quantity).toEqual(5);
    });

    it('should not return items above threshold', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create high stock item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id,
        quantity: 50
      };
      await createInventory(input);

      const results = await getLowStockItems(clientResult[0].id, 10);

      expect(results).toHaveLength(0);
    });
  });

  describe('getLowStockItemsCount', () => {
    it('should return count of low stock items', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create low stock item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id,
        quantity: 15,
        reserved_quantity: 10 // Available = 5, which is <= 10 threshold
      };
      
      const inventory = await createInventory(input);
      
      // Manually set reserved quantity since createInventory doesn't accept it
      await db.update(inventoryTable)
        .set({ reserved_quantity: 10 })
        .where(eq(inventoryTable.id, inventory.id))
        .execute();

      const count = await getLowStockItemsCount(clientResult[0].id, 10);

      expect(count).toEqual(1);
    });

    it('should return 0 when no low stock items', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();

      const count = await getLowStockItemsCount(clientResult[0].id, 10);

      expect(count).toEqual(0);
    });
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      await reserveInventory(productResult[0].id, clientResult[0].id, 20);

      // Verify reservation
      const updated = await getInventoryById(inventory.id);
      expect(updated.reserved_quantity).toEqual(20);
    });

    it('should throw error when insufficient inventory', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item with small quantity
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id,
        quantity: 10
      };
      await createInventory(input);

      await expect(reserveInventory(productResult[0].id, clientResult[0].id, 15)).rejects.toThrow(/insufficient inventory/i);
    });

    it('should throw error when inventory not found', async () => {
      await expect(reserveInventory(999, 999, 10)).rejects.toThrow(/inventory not found/i);
    });
  });

  describe('releaseInventory', () => {
    it('should release reserved inventory successfully', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      const inventory = await createInventory(input);

      // Reserve some inventory first
      await reserveInventory(productResult[0].id, clientResult[0].id, 20);

      // Release some inventory
      await releaseInventory(productResult[0].id, clientResult[0].id, 10);

      // Verify release
      const updated = await getInventoryById(inventory.id);
      expect(updated.quantity).toEqual(90); // 100 - 10
      expect(updated.reserved_quantity).toEqual(10); // 20 - 10
    });

    it('should throw error when trying to release more than reserved', async () => {
      // Create prerequisites
      const clientResult = await db.insert(usersTable).values(testClient).returning().execute();
      const productResult = await db.insert(productsTable).values(testProduct).returning().execute();
      
      // Create inventory item
      const input = {
        ...testInventoryInput,
        client_id: clientResult[0].id,
        product_id: productResult[0].id
      };
      await createInventory(input);

      // Reserve some inventory first
      await reserveInventory(productResult[0].id, clientResult[0].id, 10);

      // Try to release more than reserved
      await expect(releaseInventory(productResult[0].id, clientResult[0].id, 15)).rejects.toThrow(/cannot release more/i);
    });

    it('should throw error when inventory not found', async () => {
      await expect(releaseInventory(999, 999, 10)).rejects.toThrow(/inventory not found/i);
    });
  });
});
