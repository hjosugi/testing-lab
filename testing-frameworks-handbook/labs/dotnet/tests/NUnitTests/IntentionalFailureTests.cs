#if INTENTIONAL_FAILURES
using Checkout;
using NUnit.Framework;

namespace NUnitTests;

[TestFixture]
public sealed class IntentionalFailureTests
{
    [Test]
    public void ConstraintFailureShowsExpectedAndActualValues()
    {
        var subtotal = new CartItem("book", 1, 600).Subtotal();

        Assert.That(subtotal, Is.EqualTo(999), "constraint comparison probe");
    }
}
#endif
