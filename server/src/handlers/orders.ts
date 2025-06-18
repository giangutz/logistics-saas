
import { type Order, type CreateOrderInput, type UpdateOrderInput, type OrderItem, type CreateOrderItemInput } from '../schema';

export declare function createOrder(input: CreateOrderInput): Promise<Order>;
export declare function getOrders(): Promise<Order[]>;
export declare function getOrdersByClient(clientId: number): Promise<Order[]>;
export declare function getOrderById(id: number): Promise<Order>;
export declare function updateOrder(input: UpdateOrderInput): Promise<Order>;
export declare function deleteOrder(id: number): Promise<void>;
export declare function addOrderItem(input: CreateOrderItemInput): Promise<OrderItem>;
export declare function getOrderItems(orderId: number): Promise<OrderItem[]>;
export declare function removeOrderItem(id: number): Promise<void>;
export declare function calculateOrderTotal(orderId: number): Promise<number>;
