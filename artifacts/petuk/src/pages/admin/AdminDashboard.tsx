import React from 'react';
import { useGetDashboardStats, useGetSalesChart, useGetTopSellers, useGetRecentOrders, getGetDashboardStatsQueryKey, getGetSalesChartQueryKey, getGetTopSellersQueryKey, getGetRecentOrdersQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui/shared';
import { TrendingUp, ShoppingBag, Clock, Utensils, Tag, Users, Bike } from 'lucide-react';
import { Link } from 'wouter';

export default function AdminDashboard() {
  const { data: stats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey(), refetchInterval: 30000 } });
  const { data: chart } = useGetSalesChart({ query: { queryKey: getGetSalesChartQueryKey(), refetchInterval: 30000 } });
  const { data: topSellers } = useGetTopSellers({ query: { queryKey: getGetTopSellersQueryKey(), refetchInterval: 30000 } });
  const { data: recentOrders } = useGetRecentOrders({ query: { queryKey: getGetRecentOrdersQueryKey(), refetchInterval: 30000 } });

  const maxSales = chart ? Math.max(...chart.map(d => d.sales), 1) : 1;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground uppercase">Cockpit</h1>
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          Live Sync Active
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Sales', val: `৳${stats?.todaySales || 0}`, icon: TrendingUp, color: 'text-success' },
          { label: 'Orders', val: stats?.todayOrders || 0, icon: ShoppingBag, color: 'text-primary' },
          { label: 'Pending', val: stats?.pendingOrders || 0, icon: Clock, color: 'text-destructive' },
          { label: 'Cooking', val: stats?.cookingNow || 0, icon: Utensils, color: 'text-warning' },
          { label: 'Deliveries', val: stats?.pendingDeliveries || 0, icon: Bike, color: 'text-primary' },
          { label: 'Discounts', val: `৳${stats?.totalDiscountsToday || 0}`, icon: Tag, color: 'text-muted-foreground' },
          { label: 'Members', val: stats?.activeMembers || 0, icon: Users, color: 'text-secondary' },
        ].map((s, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
              <s.icon className={`w-6 h-6 ${s.color}`} />
              <div className="text-2xl font-bold font-display">{s.val}</div>
              <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>7-Day Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 mt-4">
              {chart?.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex justify-center h-full items-end relative">
                    <div 
                      className="w-full bg-primary/80 hover:bg-primary transition-all rounded-t-sm shadow-petuk group-hover:scale-105 origin-bottom relative"
                      style={{ height: `${(d.sales / maxSales) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-background text-xs py-1 px-2 rounded whitespace-nowrap font-bold z-10 pointer-events-none transition-opacity">
                        ৳{d.sales}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase text-center">{d.label.slice(0,3)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y divide-border/50">
              {topSellers?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-medium">{item.qtySold} sold</div>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-primary">৳{item.revenue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Live Feed</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border/50">
            {recentOrders?.map(order => (
              <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-lg font-mono font-bold tracking-widest text-lg border border-primary/20">
                    {order.orderId}
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide flex items-center gap-2">
                      {order.orderType} 
                      <Badge variant={order.status === 'pending' ? 'destructive' : order.status === 'cooking' ? 'warning' : 'success'}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">
                      {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">৳{order.total}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase">{order.paymentMethod}</div>
                  </div>
                </div>
              </div>
            ))}
            {recentOrders?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground font-bold uppercase">No recent orders</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
