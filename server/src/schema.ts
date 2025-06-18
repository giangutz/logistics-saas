
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'client']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Delivery status enum
export const deliveryStatusSchema = z.enum(['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed']);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  company_name: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema,
  company_name: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  company_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit_price: z.number(),
  weight: z.number().nullable(),
  dimensions: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  unit_price: z.number().positive(),
  weight: z.number().positive().nullable(),
  dimensions: z.string().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit_price: z.number().positive().optional(),
  weight: z.number().positive().nullable().optional(),
  dimensions: z.string().nullable().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Inventory schemas
export const inventorySchema = z.object({
  id: z.number(),
  client_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  warehouse_location: z.string().nullable(),
  last_updated: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

export const createInventoryInputSchema = z.object({
  client_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().nonnegative(),
  warehouse_location: z.string().nullable()
});

export type CreateInventoryInput = z.infer<typeof createInventoryInputSchema>;

export const updateInventoryInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().nonnegative().optional(),
  reserved_quantity: z.number().int().nonnegative().optional(),
  warehouse_location: z.string().nullable().optional()
});

export type UpdateInventoryInput = z.infer<typeof updateInventoryInputSchema>;

// Order schemas
export const orderSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  order_number: z.string(),
  status: orderStatusSchema,
  total_amount: z.number(),
  shipping_address: z.string(),
  billing_address: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderInputSchema = z.object({
  client_id: z.number(),
  shipping_address: z.string().min(1),
  billing_address: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema.optional(),
  shipping_address: z.string().min(1).optional(),
  billing_address: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;

// Order item schemas
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const createOrderItemInputSchema = z.object({
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive()
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

// Delivery schemas
export const deliverySchema = z.object({
  id: z.number(),
  order_id: z.number(),
  tracking_number: z.string(),
  status: deliveryStatusSchema,
  carrier: z.string().nullable(),
  estimated_delivery_date: z.coerce.date().nullable(),
  actual_delivery_date: z.coerce.date().nullable(),
  delivery_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Delivery = z.infer<typeof deliverySchema>;

export const createDeliveryInputSchema = z.object({
  order_id: z.number(),
  tracking_number: z.string().min(1),
  carrier: z.string().nullable(),
  estimated_delivery_date: z.coerce.date().nullable()
});

export type CreateDeliveryInput = z.infer<typeof createDeliveryInputSchema>;

export const updateDeliveryInputSchema = z.object({
  id: z.number(),
  status: deliveryStatusSchema.optional(),
  carrier: z.string().nullable().optional(),
  estimated_delivery_date: z.coerce.date().nullable().optional(),
  actual_delivery_date: z.coerce.date().nullable().optional(),
  delivery_notes: z.string().nullable().optional()
});

export type UpdateDeliveryInput = z.infer<typeof updateDeliveryInputSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Dashboard analytics schemas
export const clientDashboardStatsSchema = z.object({
  totalOrders: z.number().int(),
  pendingOrders: z.number().int(),
  deliveredOrders: z.number().int(),
  totalRevenue: z.number(),
  lowStockItems: z.number().int()
});

export type ClientDashboardStats = z.infer<typeof clientDashboardStatsSchema>;

export const adminDashboardStatsSchema = z.object({
  totalClients: z.number().int(),
  totalOrders: z.number().int(),
  totalRevenue: z.number(),
  pendingDeliveries: z.number().int(),
  totalProducts: z.number().int()
});

export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>;
