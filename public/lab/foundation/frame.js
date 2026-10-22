const price = Number(new URLSearchParams(location.search).get("price")) || 48;
document.getElementById("frame-price").textContent = String(price);
window.frameProduct = { price, scope: "商品预览 iframe" };
