// Store-wide product quantity limit. Delivery fees are configured in StoreSettings (poisha).
export const shopConfig = {
  deliveryFeeInsideDhaka: 6000, // ৳60
  maxQuantityPerItem: 50,
};

export function deliveryFee(itemCount: number, tiers: { minItems: number; insideDhakaFee: number }[]) {
  const active = [...tiers].sort((a, b) => a.minItems - b.minItems).filter((tier) => tier.minItems <= itemCount).at(-1);
  return active?.insideDhakaFee ?? shopConfig.deliveryFeeInsideDhaka;
}
