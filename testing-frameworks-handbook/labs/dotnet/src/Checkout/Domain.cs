namespace Checkout;

public sealed record CartItem(string Sku, int Quantity, int UnitPrice)
{
    public int Subtotal() => Quantity > 0 && UnitPrice >= 0
        ? checked(Quantity * UnitPrice)
        : throw new ArgumentOutOfRangeException(nameof(Quantity));
}

public sealed record Order(string Id, int Total, string Status, string PaymentId);

public interface IPaymentGateway
{
    Task<string> Capture(int amount, string token, CancellationToken cancellationToken = default);
}

public interface IOrderRepository
{
    Task Save(Order order, CancellationToken cancellationToken = default);
}

public sealed class CheckoutService(IPaymentGateway payments, IOrderRepository orders)
{
    public async Task<Order> Checkout(
        string id, IReadOnlyList<CartItem> items, string token,
        CancellationToken cancellationToken = default)
    {
        if (items.Count == 0) throw new ArgumentException("cart must not be empty", nameof(items));
        var total = items.Aggregate(0, (sum, item) => checked(sum + item.Subtotal()));
        var paymentId = await payments.Capture(total, token, cancellationToken);
        var order = new Order(id, total, "CONFIRMED", paymentId);
        await orders.Save(order, cancellationToken);
        return order;
    }
}

