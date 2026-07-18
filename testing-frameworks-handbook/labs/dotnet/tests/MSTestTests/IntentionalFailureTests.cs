#if INTENTIONAL_FAILURES
using Checkout;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MSTestTests;

[TestClass]
public sealed class IntentionalFailureTests
{
    [TestMethod]
    public void AssertionFailureShowsExpectedAndActualValues()
    {
        var subtotal = new CartItem("book", 1, 600).Subtotal();

        Assert.AreEqual(999, subtotal, "assertion comparison probe");
    }
}
#endif
