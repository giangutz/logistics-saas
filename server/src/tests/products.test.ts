
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput } from '../schema';
import { 
  createProduct, 
  getProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  getProductBySku 
} from '../handlers/products';
import { eq } from 'drizzle-orm';

const testProductInput: CreateProductInput = {
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'A product for testing',
  unit_price: 19.99,
  weight: 2.5,
  dimensions: '10x5x3'
};

const testProductInputMinimal: CreateProductInput = {
  sku: 'TEST-002',
  name: 'Minimal Product',
  description: null,
  unit_price: 9.99,
  weight: null,
  dimensions: null
};

describe('Products', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createProduct', () => {
    it('should create a product with all fields', async () => {
      const result = await createProduct(testProductInput);

      expect(result.sku).toEqual('TEST-001');
      expect(result.name).toEqual('Test Product');
      expect(result.description).toEqual('A product for testing');
      expect(result.unit_price).toEqual(19.99);
      expect(typeof result.unit_price).toBe('number');
      expect(result.weight).toEqual(2.5);
      expect(typeof result.weight).toBe('number');
      expect(result.dimensions).toEqual('10x5x3');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a product with minimal fields', async () => {
      const result = await createProduct(testProductInputMinimal);

      expect(result.sku).toEqual('TEST-002');
      expect(result.name).toEqual('Minimal Product');
      expect(result.description).toBeNull();
      expect(result.unit_price).toEqual(9.99);
      expect(result.weight).toBeNull();
      expect(result.dimensions).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should save product to database', async () => {
      const result = await createProduct(testProductInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      expect(products[0].sku).toEqual('TEST-001');
      expect(products[0].name).toEqual('Test Product');
      expect(parseFloat(products[0].unit_price)).toEqual(19.99);
      expect(parseFloat(products[0].weight!)).toEqual(2.5);
    });

    it('should throw error for duplicate SKU', async () => {
      await createProduct(testProductInput);
      
      await expect(createProduct(testProductInput)).rejects.toThrow();
    });
  });

  describe('getProducts', () => {
    it('should return empty array when no products exist', async () => {
      const result = await getProducts();
      expect(result).toEqual([]);
    });

    it('should return all products', async () => {
      await createProduct(testProductInput);
      await createProduct(testProductInputMinimal);

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(result[0].sku).toEqual('TEST-001');
      expect(result[0].unit_price).toEqual(19.99);
      expect(typeof result[0].unit_price).toBe('number');
      expect(result[1].sku).toEqual('TEST-002');
      expect(result[1].unit_price).toEqual(9.99);
      expect(typeof result[1].unit_price).toBe('number');
    });
  });

  describe('getProductById', () => {
    it('should return product by id', async () => {
      const created = await createProduct(testProductInput);
      const result = await getProductById(created.id);

      expect(result.id).toEqual(created.id);
      expect(result.sku).toEqual('TEST-001');
      expect(result.name).toEqual('Test Product');
      expect(result.unit_price).toEqual(19.99);
      expect(typeof result.unit_price).toBe('number');
      expect(result.weight).toEqual(2.5);
      expect(typeof result.weight).toBe('number');
    });

    it('should throw error for non-existent product', async () => {
      await expect(getProductById(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const created = await createProduct(testProductInput);
      
      const updateInput: UpdateProductInput = {
        id: created.id,
        name: 'Updated Product',
        unit_price: 29.99,
        weight: 3.0
      };

      const result = await updateProduct(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.sku).toEqual('TEST-001'); // unchanged
      expect(result.name).toEqual('Updated Product');
      expect(result.unit_price).toEqual(29.99);
      expect(typeof result.unit_price).toBe('number');
      expect(result.weight).toEqual(3.0);
      expect(typeof result.weight).toBe('number');
    });

    it('should update product to null values', async () => {
      const created = await createProduct(testProductInput);
      
      const updateInput: UpdateProductInput = {
        id: created.id,
        description: null,
        weight: null,
        dimensions: null
      };

      const result = await updateProduct(updateInput);

      expect(result.description).toBeNull();
      expect(result.weight).toBeNull();
      expect(result.dimensions).toBeNull();
    });

    it('should throw error for non-existent product', async () => {
      const updateInput: UpdateProductInput = {
        id: 999,
        name: 'Updated Product'
      };

      await expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      const created = await createProduct(testProductInput);
      
      await deleteProduct(created.id);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, created.id))
        .execute();

      expect(products).toHaveLength(0);
    });

    it('should throw error for non-existent product', async () => {
      await expect(deleteProduct(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('getProductBySku', () => {
    it('should return product by SKU', async () => {
      await createProduct(testProductInput);
      const result = await getProductBySku('TEST-001');

      expect(result.sku).toEqual('TEST-001');
      expect(result.name).toEqual('Test Product');
      expect(result.unit_price).toEqual(19.99);
      expect(typeof result.unit_price).toBe('number');
    });

    it('should throw error for non-existent SKU', async () => {
      await expect(getProductBySku('NONEXISTENT')).rejects.toThrow(/not found/i);
    });
  });
});
