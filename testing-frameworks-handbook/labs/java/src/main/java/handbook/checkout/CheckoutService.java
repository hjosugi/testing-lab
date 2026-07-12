package handbook.checkout;

import java.util.List;

public final class CheckoutService {
    private final PaymentGateway payments;
    private final OrderRepository orders;

    public CheckoutService(PaymentGateway payments, OrderRepository orders) {
        this.payments = payments;
        this.orders = orders;
    }

    public Order checkout(String orderId, List<CartItem> items, String token) {
        if (items.isEmpty()) throw new IllegalArgumentException("cart must not be empty");
        int total = items.stream().mapToInt(CartItem::subtotal).reduce(0, Math::addExact);
        String paymentId = payments.capture(total, token);
        Order order = new Order(orderId, total, Order.Status.CONFIRMED, paymentId);
        orders.save(order);
        return order;
    }
}

