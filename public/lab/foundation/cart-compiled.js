export function expectedTotal(config) {
    return config.price * config.quantity - config.discount;
}
export function multiplyPrice(price, quantity, fault) {
    if (fault === 1)
        return price + quantity;
    if (fault === 2)
        return String(price) + String(quantity);
    return Number(price) * quantity;
}
export function readDiscount(config, corrected) {
    const discount = corrected ? config.discount : 0; // Local 中的同名值。
    return discount;
}
function makeDiscountReader(discount) {
    return () => discount;
}
export function applyDiscount(subtotal, discount) {
    return subtotal - discount;
}
export function calculateTotal(config, correction = "") {
    const corrected = correction === (config.variant === 0 ? "a" : "b");
    let subtotal = config.price * config.quantity;
    let discount = config.discount;
    if (config.lesson === "01" && config.variant === 1 && !corrected)
        return String(config.price) + config.quantity;
    if (config.lesson === "13" && !corrected) {
        if (config.variant === 0)
            discount = config.coupon ?? 0;
        else
            return applyDiscount(applyDiscount(subtotal, discount), discount);
    }
    if (config.lesson === "14" && !corrected) {
        subtotal =
            config.variant === 0
                ? multiplyPrice(String(config.price), config.quantity, 2)
                : multiplyPrice(config.price, config.quantity, 1);
    }
    if (config.lesson === "15") {
        if (config.variant === 0)
            discount = readDiscount(config, corrected);
        else {
            const cached = makeDiscountReader(config.discount + 3);
            discount = corrected ? makeDiscountReader(config.discount)() : cached();
        }
    }
    return applyDiscount(Number(subtotal), discount);
}
export function readProductName(product, variant, corrected) {
    if (corrected)
        return (product.name ?? "未命名商品").toUpperCase();
    return variant === 0
        ? product.name.toUpperCase()
        : product.title.toUpperCase();
}
export function buildSummary(config, corrected) {
    return readProductName({ name: config.variant === 0 && !corrected ? null : config.name }, config.variant, corrected);
}
export function checkout(config, corrected) {
    return buildSummary(config, corrected);
}
export function auditInventory(config, corrected) {
    const items = Array.from({ length: 6 }, (_, index) => ({
        sku: `${config.sku}-${index}`,
        price: config.price,
        stock: 6,
    }));
    const index = 1 + (config.seed % 4);
    if (config.variant === 0)
        items[index].price = String(config.price);
    else
        items[index].stock = -2;
    let accepted = 0;
    for (const item of items) {
        if (corrected && item.stock < 0)
            continue;
        if (corrected)
            item.price = Number(item.price);
        if (typeof item.price === "number" && item.stock >= 0)
            accepted++;
        else if (!corrected)
            accepted++;
    }
    return {
        items,
        accepted,
        expected: config.variant === 0 ? 6 : 5,
        normalized: items.every((item) => typeof item.price === "number"),
    };
}
export function mutateCart(node, amount) {
    node.textContent = String(Number(node.textContent) + amount);
}
export function parseDiscount(text) {
    return JSON.parse(text);
}
export function commitSearch(node, value, request, latest, corrected) {
    if (corrected && request !== latest)
        return;
    node.textContent = value;
}
//# sourceMappingURL=cart-compiled.js.map