import { getTier } from "./tiers";

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  category?: string;
}

export interface DiscountSettings {
  taxEnabled: boolean;
  taxRate: number;
  deliveryFeeEnabled: boolean;
  deliveryFee: number;
  maxCashierDiscountPercent: number;
  maxCashierDiscountAmount: number;
  pointsPer100Taka: number;
}

export interface CalcResult {
  subtotal: number;
  memberDiscount: number;
  memberTier: string | null;
  couponDiscount: number;
  manualDiscount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  pointsEarned: number;
}

export function calculateOrder(
  items: OrderItem[],
  opts: {
    orderType: string;
    memberPoints?: number | null;
    manualDiscount?: number;
    manualDiscountType?: "percent" | "fixed";
    couponDiscount?: number;
    settings: DiscountSettings;
  }
): CalcResult {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  let memberTier: string | null = null;
  let memberDiscount = 0;
  if (opts.memberPoints != null) {
    const tier = getTier(opts.memberPoints);
    memberTier = tier.name;
    memberDiscount = subtotal * (tier.discountPercent / 100);
  }

  const afterMember = subtotal - memberDiscount;

  const couponDiscount = opts.couponDiscount ?? 0;
  const afterCoupon = Math.max(0, afterMember - couponDiscount);

  // Manual discount with caps
  let manualDiscount = 0;
  if (opts.manualDiscount && opts.manualDiscount > 0) {
    const raw = opts.manualDiscountType === "percent"
      ? afterCoupon * (opts.manualDiscount / 100)
      : opts.manualDiscount;
    const capByPercent = afterCoupon * (opts.settings.maxCashierDiscountPercent / 100);
    const capByAmount = opts.settings.maxCashierDiscountAmount;
    manualDiscount = Math.min(raw, capByPercent, capByAmount);
  }

  const afterAll = Math.max(0, afterCoupon - manualDiscount);
  const taxAmount = opts.settings.taxEnabled ? afterAll * (opts.settings.taxRate / 100) : 0;
  const deliveryFee = (opts.orderType === "delivery" && opts.settings.deliveryFeeEnabled) ? opts.settings.deliveryFee : 0;
  const total = afterAll + taxAmount + deliveryFee;
  const pointsEarned = Math.floor(subtotal / 100) * opts.settings.pointsPer100Taka;

  return {
    subtotal,
    memberDiscount,
    memberTier,
    couponDiscount,
    manualDiscount,
    taxAmount,
    deliveryFee,
    total,
    pointsEarned,
  };
}
