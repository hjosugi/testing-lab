using Checkout;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MSTestTests;

public sealed class FakePayments : IPaymentGateway
{
    public List<int> Captured { get; } = [];

    public Task<string> Capture(
        int amount, string token, CancellationToken cancellationToken = default)
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

[TestClass]
public sealed class CheckoutTests
{
    [TestMethod]
    [DataRow(1, 600)]
    [DataRow(2, 1200)]
    public async Task ObservableStateMatchesCheckoutResult(int quantity, int expected)
    {
        var payments = new FakePayments();
        var orders = new MemoryOrders();
        var service = new CheckoutService(payments, orders);

        var result = await service.Checkout(
            "o-1", [new("book", quantity, 600)], "t-1");

        Assert.AreEqual(expected, result.Total);
        CollectionAssert.AreEqual(new[] { result }, orders.Saved);
    }

    [TestMethod]
    public async Task ImportantInteractionsAreRecorded()
    {
        var payments = new FakePayments();
        var orders = new MemoryOrders();

        var result = await new CheckoutService(payments, orders)
            .Checkout("o-1", [new("book", 2, 600)], "t-1");

        CollectionAssert.AreEqual(new[] { 1200 }, payments.Captured);
        CollectionAssert.AreEqual(new[] { result }, orders.Saved);
    }

    [TestMethod]
    public async Task CancellationStopsBeforeOrderPersistence()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var orders = new MemoryOrders();
        var service = new CheckoutService(new CancelAwarePayments(), orders);

        var error = await Assert.ThrowsExactlyAsync<OperationCanceledException>(
            () => service.Checkout(
                "o-cancelled", [new("book", 1, 600)], "t-1", cancellation.Token));

        Assert.AreEqual(cancellation.Token, error.CancellationToken);
        Assert.AreEqual(0, orders.Saved.Count);
    }

    [TestMethod]
    public async Task AsyncPaymentFailureIsPropagatedWithoutSaving()
    {
        var orders = new MemoryOrders();
        var service = new CheckoutService(
            new FailingPayments(new InvalidOperationException("payment declined")), orders);

        var error = await Assert.ThrowsExactlyAsync<InvalidOperationException>(
            () => service.Checkout(
                "o-declined", [new("book", 1, 600)], "t-declined"));

        Assert.AreEqual("payment declined", error.Message);
        Assert.AreEqual(0, orders.Saved.Count);
    }
}
