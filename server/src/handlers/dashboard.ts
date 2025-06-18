
import { type ClientDashboardStats, type AdminDashboardStats } from '../schema';

export declare function getClientDashboardStats(clientId: number): Promise<ClientDashboardStats>;
export declare function getAdminDashboardStats(): Promise<AdminDashboardStats>;
export declare function getRevenueByClient(clientId: number): Promise<number>;
export declare function getTotalSystemRevenue(): Promise<number>;
export declare function getOrderStatusCounts(clientId?: number): Promise<Record<string, number>>;
export declare function getDeliveryStatusCounts(): Promise<Record<string, number>>;
