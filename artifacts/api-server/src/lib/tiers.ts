export type TierInfo = {
  name: string;
  discountPercent: number;
  color: string;
  nextTierPoints: number | null;
  nextTierName: string | null;
};

export function getTier(points: number): TierInfo {
  if (points >= 5000) {
    return { name: "Platinum", discountPercent: 15, color: "#E5E4E2", nextTierPoints: null, nextTierName: null };
  } else if (points >= 2000) {
    return { name: "Gold", discountPercent: 10, color: "#FFD600", nextTierPoints: 5000, nextTierName: "Platinum" };
  } else if (points >= 500) {
    return { name: "Silver", discountPercent: 5, color: "#C0C0C0", nextTierPoints: 2000, nextTierName: "Gold" };
  } else {
    return { name: "Regular", discountPercent: 0, color: "#FFFFFF", nextTierPoints: 500, nextTierName: "Silver" };
  }
}

export function calcPointsEarned(subtotal: number, pointsPer100: number): number {
  return Math.floor(subtotal / 100) * pointsPer100;
}
