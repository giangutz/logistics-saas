
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createInventoryInputSchema,
  updateInventoryInputSchema,
  createOrderInputSchema,
  updateOrderInputSchema,
  createOrderItemInputSchema,
  createDeliveryInputSchema,
  updateDeliveryInputSchema
} from './schema';

// Handler imports
import { login, register, getCurrentUser } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUser, deleteUser, getClientUsers } from './handlers/users';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductBySku } from './handlers/products';
import { createInventory, getInventory, getInventoryByClient, getInventoryById, updateInventory, deleteInventory, getLowStockItems, reserveInventory, releaseInventory } from './handlers/inventory';
import { createOrder, getOrders, getOrdersByClient, getOrderById, updateOrder, deleteOrder, addOrderItem, getOrderItems, removeOrderItem, calculateOrderTotal } from './handlers/orders';
import { createDelivery, getDeliveries, getDeliveryById, getDeliveryByOrder, updateDelivery, getDeliveriesByStatus, trackDelivery } from './handlers/deliveries';
import { getClientDashboardStats, getAdminDashboardStats, getRevenueByClient, getTotalSystemRevenue, getOrderStatusCounts, getDeliveryStatusCounts } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => register(input)),
  
  getCurrentUser: publicProcedure
    .input(z.number())
    .query(({ input }) => getCurrentUser(input)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  deleteUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteUser(input)),
  
  getClientUsers: publicProcedure
    .query(() => getClientUsers()),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  deleteProduct: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteProduct(input)),
  
  getProductBySku: publicProcedure
    .input(z.string())
    .query(({ input }) => getProductBySku(input)),

  // Inventory management routes
  createInventory: publicProcedure
    .input(createInventoryInputSchema)
    .mutation(({ input }) => createInventory(input)),
  
  getInventory: publicProcedure
    .query(() => getInventory()),
  
  getInventoryByClient: publicProcedure
    .input(z.number())
    .query(({ input }) => getInventoryByClient(input)),
  
  getInventoryById: publicProcedure
    .input(z.number())
    .query(({ input }) => getInventoryById(input)),
  
  updateInventory: publicProcedure
    .input(updateInventoryInputSchema)
    .mutation(({ input }) => updateInventory(input)),
  
  deleteInventory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteInventory(input)),
  
  getLowStockItems: publicProcedure
    .input(z.object({ clientId: z.number(), threshold: z.number().optional() }))
    .query(({ input }) => getLowStockItems(input.clientId, input.threshold)),
  
  reserveInventory: publicProcedure
    .input(z.object({ productId: z.number(), clientId: z.number(), quantity: z.number() }))
    .mutation(({ input }) => reserveInventory(input.productId, input.clientId, input.quantity)),
  
  releaseInventory: publicProcedure
    .input(z.object({ productId: z.number(), clientId: z.number(), quantity: z.number() }))
    .mutation(({ input }) => releaseInventory(input.productId, input.clientId, input.quantity)),

  // Order management routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),
  
  getOrders: publicProcedure
    .query(() => getOrders()),
  
  getOrdersByClient: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrdersByClient(input)),
  
  getOrderById: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrderById(input)),
  
  updateOrder: publicProcedure
    .input(updateOrderInputSchema)
    .mutation(({ input }) => updateOrder(input)),
  
  deleteOrder: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteOrder(input)),
  
  addOrderItem: publicProcedure
    .input(createOrderItemInputSchema)
    .mutation(({ input }) => addOrderItem(input)),
  
  getOrderItems: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrderItems(input)),
  
  removeOrderItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => removeOrderItem(input)),
  
  calculateOrderTotal: publicProcedure
    .input(z.number())
    .query(({ input }) => calculateOrderTotal(input)),

  // Delivery management routes
  createDelivery: publicProcedure
    .input(createDeliveryInputSchema)
    .mutation(({ input }) => createDelivery(input)),
  
  getDeliveries: publicProcedure
    .query(() => getDeliveries()),
  
  getDeliveryById: publicProcedure
    .input(z.number())
    .query(({ input }) => getDeliveryById(input)),
  
  getDeliveryByOrder: publicProcedure
    .input(z.number())
    .query(({ input }) => getDeliveryByOrder(input)),
  
  updateDelivery: publicProcedure
    .input(updateDeliveryInputSchema)
    .mutation(({ input }) => updateDelivery(input)),
  
  getDeliveriesByStatus: publicProcedure
    .input(z.string())
    .query(({ input }) => getDeliveriesByStatus(input)),
  
  trackDelivery: publicProcedure
    .input(z.string())
    .query(({ input }) => trackDelivery(input)),

  // Dashboard and analytics routes
  getClientDashboardStats: publicProcedure
    .input(z.number())
    .query(({ input }) => getClientDashboardStats(input)),
  
  getAdminDashboardStats: publicProcedure
    .query(() => getAdminDashboardStats()),
  
  getRevenueByClient: publicProcedure
    .input(z.number())
    .query(({ input }) => getRevenueByClient(input)),
  
  getTotalSystemRevenue: publicProcedure
    .query(() => getTotalSystemRevenue()),
  
  getOrderStatusCounts: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getOrderStatusCounts(input)),
  
  getDeliveryStatusCounts: publicProcedure
    .query(() => getDeliveryStatusCounts()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
