
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  TruckIcon, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search
} from 'lucide-react';
import type { 
  User, 
  ClientDashboardStats, 
  Order, 
  Delivery, 
  Inventory,
  Product
} from '../../../server/src/schema';

interface ClientDashboardProps {
  user: User;
}

export function ClientDashboard({ user }: ClientDashboardProps) {
  const [stats, setStats] = useState<ClientDashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedDelivery, setTrackedDelivery] = useState<Delivery | null>(null);
  const [clientRevenue, setClientRevenue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const loadClientData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        dashboardStats,
        clientOrders,
        clientInventory,
        allProducts,
        revenue
      ] = await Promise.all([
        trpc.getClientDashboardStats.query(user.id),
        trpc.getOrdersByClient.query(user.id),
        trpc.getInventoryByClient.query(user.id),
        trpc.getProducts.query(),
        trpc.getRevenueByClient.query(user.id)
      ]);

      setStats(dashboardStats);
      setOrders(clientOrders);
      setInventory(clientInventory);
      setProducts(allProducts);
      setClientRevenue(revenue);

      // Load deliveries for client orders
      const deliveryPromises = clientOrders.map((order: Order) => 
        trpc.getDeliveryByOrder.query(order.id).catch(() => null)
      );
      const orderDeliveries = await Promise.all(deliveryPromises);
      setDeliveries(orderDeliveries.filter(Boolean) as Delivery[]);

    } catch (error) {
      console.error('Failed to load client data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const handleTrackDelivery = async () => {
    if (!trackingNumber.trim()) return;
    
    setTrackingError(null);
    try {
      const delivery = await trpc.trackDelivery.query(trackingNumber.trim());
      setTrackedDelivery(delivery);
    } catch (error) {
      console.error('Failed to track delivery:', error);
      setTrackingError('Tracking number not found. Please check and try again.');
      setTrackedDelivery(null);
    }
  };

  const getStatusBadge = (status: string, type: 'order' | 'delivery') => {
    const colorMap = {
      order: {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        processing: 'bg-purple-100 text-purple-800',
        shipped: 'bg-orange-100 text-orange-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
      },
      delivery: {
        pending: 'bg-gray-100 text-gray-800',
        in_transit: 'bg-blue-100 text-blue-800',
        out_for_delivery: 'bg-orange-100 text-orange-800',
        delivered: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800'
      }
    };

    return (
      <Badge className={`${colorMap[type][status as keyof typeof colorMap[typeof type]]} border-0`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStockStatus = (quantity: number, reserved: number) => {
    const available = quantity - reserved;
    if (available <= 0) return { status: 'Out of Stock', color: 'text-red-600', progress: 0 };
    if (available <= 10) return { status: 'Low Stock', color: 'text-yellow-600', progress: 25 };
    if (available <= 50) return { status: 'Medium Stock', color: 'text-blue-600', progress: 60 };
    return { status: 'In Stock', color: 'text-green-600', progress: 100 };
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : `Product ID: ${productId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.first_name}! 🚀
        </h1>
        <p className="text-blue-100 mt-2">
          {user.company_name ? `${user.company_name} - ` : ''}Track your orders, inventory, and deliveries
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Orders</CardTitle>
              <Package className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs opacity-90">All your orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <p className="text-xs opacity-90">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.deliveredOrders}</div>
              <p className="text-xs opacity-90">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockItems}</div>
              <p className="text-xs opacity-90">Need attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${clientRevenue.toLocaleString()}</div>
              <p className="text-xs opacity-90">Total order value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Track Your Delivery</span>
          </CardTitle>
          <CardDescription>Enter your tracking number to get real-time delivery updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              placeholder="Enter tracking number..."
              value={trackingNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingNumber(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTrackDelivery} disabled={!trackingNumber.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Track
            </Button>
          </div>

          {trackingError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {trackingError}
              </AlertDescription>
            </Alert>
          )}

          {trackedDelivery && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-900">
                  Tracking: {trackedDelivery.tracking_number}
                </h4>
                {getStatusBadge(trackedDelivery.status, 'delivery')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Carrier:</span>
                  <p className="font-medium">{trackedDelivery.carrier || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Estimated Delivery:</span>
                  <p className="font-medium">
                    {trackedDelivery.estimated_delivery_date?.toLocaleDateString() || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Actual Delivery:</span>
                  <p className="font-medium">
                    {trackedDelivery.actual_delivery_date?.toLocaleDateString() || 'Pending'}
                  </p>
                </div>
              </div>
              {trackedDelivery.delivery_notes && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-gray-600">Notes:</span>
                  <p className="text-sm">{trackedDelivery.delivery_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Your Orders</CardTitle>
              <CardDescription>Track all your order history and current status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: Order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{getStatusBadge(order.status, 'order')}</TableCell>
                      <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                      <TableCell className="max-w-xs truncate">{order.shipping_address}</TableCell>
                      <TableCell>{order.created_at.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {orders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No orders found. Your orders will appear here once you place them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Your Inventory</CardTitle>
              <CardDescription>Monitor your product stock levels and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item: Inventory) => {
                    const available = item.quantity - item.reserved_quantity;
                    const stockStatus = getStockStatus(item.quantity, item.reserved_quantity);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {getProductName(item.product_id)}
                        </TableCell>
                        <TableCell>{available}</TableCell>
                        <TableCell>{item.reserved_quantity}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                            <Progress value={stockStatus.progress} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>{item.warehouse_location || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {inventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No inventory items found. Your inventory will appear here once items are added.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Your Deliveries</CardTitle>
              <CardDescription>Track all your delivery statuses and tracking information</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Est. Delivery</TableHead>
                    <TableHead>Actual Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery: Delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.tracking_number}</TableCell>
                      <TableCell>{delivery.order_id}</TableCell>
                      <TableCell>{getStatusBadge(delivery.status, 'delivery')}</TableCell>
                      <TableCell>{delivery.carrier || 'N/A'}</TableCell>
                      <TableCell>
                        {delivery.estimated_delivery_date?.toLocaleDateString() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {delivery.actual_delivery_date?.toLocaleDateString() || 'Pending'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {deliveries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TruckIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No deliveries found. Your deliveries will appear here once orders are shipped.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
