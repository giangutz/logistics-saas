
import { type Inventory, type CreateInventoryInput, type UpdateInventoryInput } from '../schema';

export declare function createInventory(input: CreateInventoryInput): Promise<Inventory>;
export declare function getInventory(): Promise<Inventory[]>;
export declare function getInventoryByClient(clientId: number): Promise<Inventory[]>;
export declare function getInventoryById(id: number): Promise<Inventory>;
export declare function updateInventory(input: UpdateInventoryInput): Promise<Inventory>;
export declare function deleteInventory(id: number): Promise<void>;
export declare function getLowStockItems(clientId: number, threshold?: number): Promise<Inventory[]>;
export declare function reserveInventory(productId: number, clientId: number, quantity: number): Promise<void>;
export declare function releaseInventory(productId: number, clientId: number, quantity: number): Promise<void>;
