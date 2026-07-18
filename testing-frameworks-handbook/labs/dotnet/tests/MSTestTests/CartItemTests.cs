using Checkout;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MSTestTests;

[TestClass]
public sealed class CartItemTests
{
    [TestMethod]
    [DataRow(1, 600, 600)]
    [DataRow(2, 600, 1200)]
    [DataRow(3, 50, 150)]
    public void SubtotalUsesQuantityAndUnitPrice(int quantity, int unitPrice, int expected)
    {
        var item = new CartItem("sku", quantity, unitPrice);
        Assert.AreEqual(expected, item.Subtotal());
    }

    [TestMethod]
    public void InvalidQuantityIsRejected()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new CartItem("sku", 0, 100).Subtotal());
    }
}
