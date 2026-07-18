package handbook.checkout;

import static com.google.common.truth.Truth.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(CheckoutFixtureExtension.class)
class CheckoutExtensionTest {
    @Test
    void parameterResolverProvidesTheComponent(
        CheckoutFixtureExtension.Fixture fixture
    ) {
        Order result = fixture.service.checkout(
            "o-extension",
            List.of(new CartItem("book", 2, 600)),
            "t-1"
        );

        OrderSubject.assertThat(result).hasTotal(1200);
        OrderSubject.assertThat(result).hasPaymentId("pay-extension");
        assertThat(fixture.orders.byId).containsEntry("o-extension", result);
        assertThat(fixture.payments.captures).containsExactly(1200);
    }

    @Test
    void parameterResolverCreatesFreshState(
        CheckoutFixtureExtension.Fixture fixture
    ) {
        assertThat(fixture.orders.byId).isEmpty();
        assertThat(fixture.payments.captures).isEmpty();
    }
}
