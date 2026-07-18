package handbook.checkout;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

class DynamicCartValidationTest {
    record InvalidItem(String name, CartItem item) {}

    @TestFactory
    Stream<DynamicTest> invalidItemsAreGeneratedAtRuntime() {
        return Stream.of(
            new InvalidItem("zero quantity", new CartItem("book", 0, 600)),
            new InvalidItem("negative quantity", new CartItem("book", -1, 600)),
            new InvalidItem("negative price", new CartItem("book", 1, -1))
        ).map(invalid -> DynamicTest.dynamicTest(
            invalid.name(),
            () -> assertThrows(IllegalArgumentException.class, invalid.item()::subtotal)
        ));
    }

    @TestFactory
    Stream<DynamicTest> emptyAndOverflowingCartsAreGeneratedAtRuntime() {
        var payments = (PaymentGateway) (amount, token) -> "pay-1";
        var orders = (OrderRepository) order -> {};
        var service = new CheckoutService(payments, orders);

        return Stream.of(
            DynamicTest.dynamicTest(
                "empty cart",
                () -> assertThrows(
                    IllegalArgumentException.class,
                    () -> service.checkout("o-1", List.of(), "t-1")
                )
            ),
            DynamicTest.dynamicTest(
                "overflowing subtotal",
                () -> assertThrows(
                    ArithmeticException.class,
                    () -> service.checkout(
                        "o-2",
                        List.of(new CartItem("bulk", Integer.MAX_VALUE, 2)),
                        "t-1"
                    )
                )
            )
        );
    }
}
