/** 可在 Sources 中逐步执行的真实商城业务源码。故障仅用于教学。 */
export interface ShopConfig {
  lesson: string;
  variant: number;
  seed: number;
  price: number;
  quantity: number;
  discount: number;
  sku: string;
  name: string;
}
export function expectedTotal(config: ShopConfig) {
  return config.price * config.quantity - config.discount;
}
export function multiplyPrice(
  price: number | string,
  quantity: number,
  fault: number,
) {
  if (fault === 1) return (price as number) + quantity;
  if (fault === 2) return String(price) + String(quantity);
  return Number(price) * quantity;
}
export function readDiscount(config: ShopConfig, corrected: boolean) {
  const discount = corrected ? config.discount : 0; // Local 中的同名值。
  return discount;
}
function makeDiscountReader(discount: number) {
  return () => discount;
}
export function applyDiscount(subtotal: number, discount: number) {
  return subtotal - discount;
}
export function calculateTotal(config: ShopConfig, correction = "") {
  const corrected = correction === (config.variant === 0 ? "a" : "b");
  let subtotal: number | string = config.price * config.quantity;
  let discount = config.discount;
  if (config.lesson === "01" && config.variant === 1 && !corrected)
    return String(config.price) + config.quantity;
  if (config.lesson === "13" && !corrected) {
    if (config.variant === 0)
      discount = (config as unknown as { coupon?: number }).coupon ?? 0;
    else return applyDiscount(applyDiscount(subtotal, discount), discount);
  }
  if (config.lesson === "14" && !corrected) {
    subtotal =
      config.variant === 0
        ? multiplyPrice(String(config.price), config.quantity, 2)
        : multiplyPrice(config.price, config.quantity, 1);
  }
  if (config.lesson === "15") {
    if (config.variant === 0) discount = readDiscount(config, corrected);
    else {
      const cached = makeDiscountReader(config.discount + 3);
      discount = corrected ? makeDiscountReader(config.discount)() : cached();
    }
  }
  return applyDiscount(Number(subtotal), discount);
}
export function readProductName(
  product: { name: string | null; title?: string },
  variant: number,
  corrected: boolean,
) {
  if (corrected) return (product.name ?? "未命名商品").toUpperCase();
  return variant === 0
    ? product.name!.toUpperCase()
    : product.title!.toUpperCase();
}
export function buildSummary(config: ShopConfig, corrected: boolean) {
  return readProductName(
    { name: config.variant === 0 && !corrected ? null : config.name },
    config.variant,
    corrected,
  );
}
export function checkout(config: ShopConfig, corrected: boolean) {
  return buildSummary(config, corrected);
}
export function auditInventory(config: ShopConfig, corrected: boolean) {
  const items = Array.from({ length: 6 }, (_, index) => ({
    sku: `${config.sku}-${index}`,
    price: config.price as number | string,
    stock: 6,
  }));
  const index = 1 + (config.seed % 4);
  if (config.variant === 0) items[index]!.price = String(config.price);
  else items[index]!.stock = -2;
  let accepted = 0;
  for (const item of items) {
    if (corrected && item.stock < 0) continue;
    if (corrected) item.price = Number(item.price);
    if (typeof item.price === "number" && item.stock >= 0) accepted++;
    else if (!corrected) accepted++;
  }
  return {
    items,
    accepted,
    expected: config.variant === 0 ? 6 : 5,
    normalized: items.every((item) => typeof item.price === "number"),
  };
}
export function mutateCart(node: HTMLElement, amount: number) {
  node.textContent = String(Number(node.textContent) + amount);
}
export function parseDiscount(text: string) {
  return JSON.parse(text) as { amount: number };
}
export function commitSearch(
  node: HTMLElement,
  value: string,
  request: number,
  latest: number,
  corrected: boolean,
) {
  if (corrected && request !== latest) return;
  node.textContent = value;
}
