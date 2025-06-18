
import { type Delivery, type CreateDeliveryInput, type UpdateDeliveryInput } from '../schema';

export declare function createDelivery(input: CreateDeliveryInput): Promise<Delivery>;
export declare function getDeliveries(): Promise<Delivery[]>;
export declare function getDeliveryById(id: number): Promise<Delivery>;
export declare function getDeliveryByOrder(orderId: number): Promise<Delivery>;
export declare function updateDelivery(input: UpdateDeliveryInput): Promise<Delivery>;
export declare function getDeliveriesByStatus(status: string): Promise<Delivery[]>;
export declare function trackDelivery(trackingNumber: string): Promise<Delivery>;
