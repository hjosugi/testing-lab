using Checkout;
using NUnit.Framework;

namespace NUnitTests;

public sealed class FakePayments : IPaymentGateway
{
    public List<int> Captured { get; } = [];
    public Task<string> Capture(int amount, string token, CancellationToken cancellationToken = default)
    {
        Captured.Add(amount);
        return Task.FromResult("pay-1");
    }
}

public sealed class MemoryOrders : IOrderRepository
{
    public List<Order> Saved { get; } = [];
    public Task Save(Order order, CancellationToken cancellationToken = default)
    {
        Saved.Add(order);
        return Task.CompletedTask;
    }
}

public sealed class CancelAwarePayments : IPaymentGateway
{
    public async Task<string> Capture(
        int amount, string token, CancellationToken cancellationToken = default)
    {
        await Task.Yield();
        cancellationToken.ThrowIfCancellationRequested();
        return "pay-1";
    }
}

public sealed class FailingPayments(Exception failure) : IPaymentGateway
{
    public Task<string> Capture(
        int amount, string token, CancellationToken cancellationToken = default) =>
        Task.FromException<string>(failure);
}

[TestFixture]
public class CheckoutTests
{
    [TestCase(1, 600)]
    [TestCase(2, 1200)]
    [TestCase(3, 1800)]
    public async Task ClassicalTestVerifiesObservableState(int quantity, int expected)
    {
        var payments = new FakePayments();
        var orders = new MemoryOrders();
        var service = new CheckoutService(payments, orders);

        var result = await service.Checkout("o-1", [new("book", quantity, 600)], "t-1");

        Assert.That(result.Total, Is.EqualTo(expected));
        Assert.That(orders.Saved, Is.EqualTo(new[] { result }));
    }

    [Test]
    public async Task LondonStyleSpiesVerifyImportantInteractions()
    {
        var payments = new FakePayments();
        var orders = new MemoryOrders();
        var result = await new CheckoutService(payments, orders)
            .Checkout("o-1", [new("book", 2, 600)], "t-1");

        Assert.Multiple(() =>
        {
            Assert.That(payments.Captured, Is.EqualTo(new[] { 1200 }));
            Assert.That(orders.Saved, Is.EqualTo(new[] { result }));
        });
    }

    [Test]
    public void CancellationStopsBeforeOrderPersistence()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var orders = new MemoryOrders();
        var service = new CheckoutService(new CancelAwarePayments(), orders);

        var error = Assert.ThrowsAsync<OperationCanceledException>(
            async () => await service.Checkout(
                "o-cancelled", [new("book", 1, 600)], "t-1", cancellation.Token));

        Assert.Multiple(() =>
        {
            Assert.That(error!.CancellationToken, Is.EqualTo(cancellation.Token));
            Assert.That(orders.Saved, Is.Empty);
        });
    }

    [Test]
    public void AsyncPaymentFailureIsPropagatedWithoutSaving()
    {
        var orders = new MemoryOrders();
        var service = new CheckoutService(
            new FailingPayments(new InvalidOperationException("payment declined")), orders);

        var error = Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.Checkout(
                "o-declined", [new("book", 1, 600)], "t-declined"));

        Assert.Multiple(() =>
        {
            Assert.That(error!.Message, Is.EqualTo("payment declined"));
            Assert.That(orders.Saved, Is.Empty);
        });
    }
}
