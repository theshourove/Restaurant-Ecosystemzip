import React, { useState } from 'react';
import { useGetReports } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input } from '@/components/ui/shared';
import { format, subDays } from 'date-fns';
import { TrendingUp, ShoppingBag, Percent, Receipt } from 'lucide-react';

export default function AdminReports() {
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: report } = useGetReports({ from, to });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Reports</h1>
        <div className="flex items-center gap-2 bg-card p-2 border border-border rounded-lg shadow-petuk">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-auto border-none shadow-none h-8" />
          <span className="font-bold text-muted-foreground px-2">TO</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-auto border-none shadow-none h-8" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', val: `৳${report?.totalSales || 0}`, icon: TrendingUp, color: 'text-success' },
          { label: 'Total Orders', val: report?.totalOrders || 0, icon: ShoppingBag, color: 'text-primary' },
          { label: 'Avg Order', val: `৳${report?.avgOrder || 0}`, icon: Receipt, color: 'text-warning' },
          { label: 'Discounts Given', val: `৳${report?.totalDiscounts || 0}`, icon: Percent, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div className="text-3xl font-bold font-display">{s.val}</div>
              <div className="text-sm uppercase font-bold text-muted-foreground tracking-wider">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-64 flex items-end justify-between gap-2 mt-4">
              {report?.dailySales?.map((d: any, i: number) => {
                const maxSales = Math.max(...report.dailySales.map((x:any) => x.sales), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex justify-center h-full items-end relative">
                      <div 
                        className="w-full bg-primary/80 hover:bg-primary transition-all rounded-t-sm"
                        style={{ height: `${(d.sales / maxSales) * 100}%`, minHeight: '4px' }}
                      />
                    </div>
                    <div className="text-xs font-bold text-muted-foreground uppercase text-center rotate-45 md:rotate-0 origin-left mt-2">{format(new Date(d.date), 'MMM d')}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.topSellers?.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell>{item.qtySold}</TableCell>
                      <TableCell className="text-right font-bold text-primary">৳{item.revenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
