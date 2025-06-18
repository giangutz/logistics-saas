
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'client']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  company_name: text('company_name'),
  phone: text('phone'),
  address: text('address'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  weight: numeric('weight', { precision: 8, scale: 2 }),
  dimensions: text('dimensions'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => usersTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(0),
  reserved_quantity: integer('reserved_quantity').notNull().default(0),
  warehouse_location: text('warehouse_location'),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => usersTable.id),
  order_number: text('order_number').notNull().unique(),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shipping_address: text('shipping_address').notNull(),
  billing_address: text('billing_address'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Deliveries table
export const deliveriesTable = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  tracking_number: text('tracking_number').notNull().unique(),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  carrier: text('carrier'),
  estimated_delivery_date: timestamp('estimated_delivery_date'),
  actual_delivery_date: timestamp('actual_delivery_date'),
  delivery_notes: text('delivery_notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  orders: many(ordersTable),
  inventory: many(inventoryTable),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  inventory: many(inventoryTable),
  orderItems: many(orderItemsTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  client: one(usersTable, {
    fields: [ordersTable.client_id],
    references: [usersTable.id],
  }),
  orderItems: many(orderItemsTable),
  delivery: one(deliveriesTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  client: one(usersTable, {
    fields: [inventoryTable.client_id],
    references: [usersTable.id],
  }),
  product: one(productsTable, {
    fields: [inventoryTable.product_id],
    references: [productsTable.id],
  }),
}));

export const deliveriesRelations = relations(deliveriesTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [deliveriesTable.order_id],
    references: [ordersTable.id],
  }),
}));

// Export all tables
export const tables = {
  users: usersTable,
  products: productsTable,
  inventory: inventoryTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  deliveries: deliveriesTable,
};
