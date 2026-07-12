package handbook.checkout;

public record CartItem(String sku, int quantity, int unitPrice) {
    public int subtotal() {
        if (quantity <= 0 || unitPrice < 0) {
            throw new IllegalArgumentException("quantity must be positive and price non-negative");
        }
        return Math.multiplyExact(quantity, unitPrice);
    }
}

