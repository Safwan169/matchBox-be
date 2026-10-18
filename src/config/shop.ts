// Store rules. Amounts are in poisha (1/100 BDT).
export const shopConfig = {
  deliveryFeeInsideDhaka: 6000, // ৳60
  deliveryFeeOutsideDhaka: 12000, // ৳120
  freeDeliveryThreshold: 300000, // free delivery on subtotals of ৳3,000+
  maxQuantityPerItem: 50,
};

export function deliveryFee(subtotal: number, city: string) {
  if (subtotal >= shopConfig.freeDeliveryThreshold) return 0;
  return city.trim().toLowerCase() === "dhaka" ? shopConfig.deliveryFeeInsideDhaka : shopConfig.deliveryFeeOutsideDhaka;
}
