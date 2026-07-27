import React from 'react';
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Button } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Store, Receipt, Bike, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Not yet created, we'll just mock or create a simple toast if needed. But we have radx toast in package.json.

export default function AdminSettings() {
  const { data: settings } = useGetSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState<any>(null);

  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const updateMutation = useUpdateSettings({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      alert('Settings Saved');
    }
  });

  if (!formData) return <div>Loading...</div>;

  const handleChange = (k: string, v: any) => setFormData((p:any) => ({ ...p, [k]: v }));
  
  const save = () => updateMutation.mutate({ data: formData });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">System Settings</h1>
        <Button onClick={save} disabled={updateMutation.isPending} size="lg">Save Changes</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <CardTitle>Restaurant Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input value={formData.restaurantName} onChange={e => handleChange('restaurantName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => handleChange('address', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <CardTitle>Tax & Currency</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border md:col-span-2">
              <div>
                <Label className="text-base text-foreground">Enable Tax</Label>
                <div className="text-xs text-muted-foreground mt-1">Apply tax to all orders</div>
              </div>
              <input type="checkbox" className="w-6 h-6 accent-primary" checked={formData.taxEnabled} onChange={e => handleChange('taxEnabled', e.target.checked)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input value={formData.taxName} onChange={e => handleChange('taxName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={formData.taxRate} onChange={e => handleChange('taxRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input value={formData.currency} onChange={e => handleChange('currency', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Receipt Paper Width (mm)</Label>
              <Input type="number" value={formData.paperWidth} onChange={e => handleChange('paperWidth', parseInt(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            <CardTitle>Delivery Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2 flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border md:col-span-2">
              <Label className="text-base text-foreground">Enable Delivery Fee</Label>
              <input type="checkbox" className="w-6 h-6 accent-primary" checked={formData.deliveryFeeEnabled} onChange={e => handleChange('deliveryFeeEnabled', e.target.checked)} />
            </div>
            <div className="space-y-2">
              <Label>Delivery Fee Amount</Label>
              <Input type="number" value={formData.deliveryFee} onChange={e => handleChange('deliveryFee', parseFloat(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle>Discounts & Loyalty</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Cashier Discount (%)</Label>
              <Input type="number" value={formData.maxCashierDiscountPercent} onChange={e => handleChange('maxCashierDiscountPercent', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Max Cashier Discount (Fixed)</Label>
              <Input type="number" value={formData.maxCashierDiscountAmount} onChange={e => handleChange('maxCashierDiscountAmount', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Points Earned Per 100 Taka</Label>
              <Input type="number" value={formData.pointsPer100Taka} onChange={e => handleChange('pointsPer100Taka', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Points Redemption Rate (Taka/Pt)</Label>
              <Input type="number" step="0.1" value={formData.pointsRedemptionRate} onChange={e => handleChange('pointsRedemptionRate', parseFloat(e.target.value))} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
