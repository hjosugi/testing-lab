package handbook.checkout;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.ParameterContext;
import org.junit.jupiter.api.extension.ParameterResolutionException;
import org.junit.jupiter.api.extension.ParameterResolver;

final class CheckoutFixtureExtension implements ParameterResolver {
    static final class Fixture {
        final FakePayments payments = new FakePayments();
        final InMemoryOrders orders = new InMemoryOrders();
        final CheckoutService service = new CheckoutService(payments, orders);
    }

    static final class FakePayments implements PaymentGateway {
        final List<Integer> captures = new ArrayList<>();

        @Override
        public String capture(int amount, String token) {
            captures.add(amount);
            return "pay-extension";
        }
    }

    static final class InMemoryOrders implements OrderRepository {
        final Map<String, Order> byId = new HashMap<>();

        @Override
        public void save(Order order) {
            byId.put(order.orderId(), order);
        }
    }

    @Override
    public boolean supportsParameter(
        ParameterContext parameterContext,
        ExtensionContext extensionContext
    ) {
        return parameterContext.getParameter().getType() == Fixture.class;
    }

    @Override
    public Fixture resolveParameter(
        ParameterContext parameterContext,
        ExtensionContext extensionContext
    ) throws ParameterResolutionException {
        return new Fixture();
    }
}
