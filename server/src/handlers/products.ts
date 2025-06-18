
import { type Product, type CreateProductInput, type UpdateProductInput } from '../schema';

export declare function createProduct(input: CreateProductInput): Promise<Product>;
export declare function getProducts(): Promise<Product[]>;
export declare function getProductById(id: number): Promise<Product>;
export declare function updateProduct(input: UpdateProductInput): Promise<Product>;
export declare function deleteProduct(id: number): Promise<void>;
export declare function getProductBySku(sku: string): Promise<Product>;
