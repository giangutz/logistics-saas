
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    const result = await db.insert(productsTable)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description,
        unit_price: input.unit_price.toString(),
        weight: input.weight?.toString() || null,
        dimensions: input.dimensions
      })
      .returning()
      .execute();

    const product = result[0];
    return {
      ...product,
      unit_price: parseFloat(product.unit_price),
      weight: product.weight ? parseFloat(product.weight) : null
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    return results.map(product => ({
      ...product,
      unit_price: parseFloat(product.unit_price),
      weight: product.weight ? parseFloat(product.weight) : null
    }));
  } catch (error) {
    console.error('Get products failed:', error);
    throw error;
  }
};

export const getProductById = async (id: number): Promise<Product> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Product with id ${id} not found`);
    }

    const product = results[0];
    return {
      ...product,
      unit_price: parseFloat(product.unit_price),
      weight: product.weight ? parseFloat(product.weight) : null
    };
  } catch (error) {
    console.error('Get product by id failed:', error);
    throw error;
  }
};

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    const updateValues: any = {};
    
    if (input.sku !== undefined) updateValues.sku = input.sku;
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.unit_price !== undefined) updateValues.unit_price = input.unit_price.toString();
    if (input.weight !== undefined) updateValues.weight = input.weight?.toString() || null;
    if (input.dimensions !== undefined) updateValues.dimensions = input.dimensions;

    const result = await db.update(productsTable)
      .set(updateValues)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    const product = result[0];
    return {
      ...product,
      unit_price: parseFloat(product.unit_price),
      weight: product.weight ? parseFloat(product.weight) : null
    };
  } catch (error) {
    console.error('Update product failed:', error);
    throw error;
  }
};

export const deleteProduct = async (id: number): Promise<void> => {
  try {
    const result = await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product with id ${id} not found`);
    }
  } catch (error) {
    console.error('Delete product failed:', error);
    throw error;
  }
};

export const getProductBySku = async (sku: string): Promise<Product> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.sku, sku))
      .execute();

    if (results.length === 0) {
      throw new Error(`Product with sku ${sku} not found`);
    }

    const product = results[0];
    return {
      ...product,
      unit_price: parseFloat(product.unit_price),
      weight: product.weight ? parseFloat(product.weight) : null
    };
  } catch (error) {
    console.error('Get product by sku failed:', error);
    throw error;
  }
};
