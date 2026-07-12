package handbook.checkout;

import static com.google.common.truth.Truth.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ClassicalCheckoutTest {
    static class FakePayments implements PaymentGateway {
        final List<Integer> captures = new ArrayList<>();
        public String capture(int amount, String token) {
            captures.add(amount);
            return "pay-1";
        }
    }

    static class InMemoryOrders implements OrderRepository {
        final Map<String, Order> byId = new HashMap<>();
        public void save(Order order) { byId.put(order.orderId(), order); }
    }

    static java.util.stream.Stream<Arguments> carts() {
        return java.util.stream.Stream.of(
            Arguments.of(List.of(new CartItem("book", 2, 600)), 1200),
            Arguments.of(List.of(new CartItem("a", 1, 100), new CartItem("b", 3, 50)), 250)
        );
    }

    @ParameterizedTest
    @MethodSource("carts")
    void confirmsAndPersistsTheObservableOutcome(List<CartItem> items, int expected) {
        var payments = new FakePayments();
        var orders = new InMemoryOrders();
        var service = new CheckoutService(payments, orders);

        Order result = service.checkout("o-1", items, "t-1");

        assertThat(result.total()).isEqualTo(expected);
        assertThat(result.status()).isEqualTo(Order.Status.CONFIRMED);
        assertThat(orders.byId).containsEntry("o-1", result);
        assertThat(payments.captures).containsExactly(expected);
    }
}

