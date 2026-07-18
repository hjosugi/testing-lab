package handbook.checkout;

import static com.google.common.truth.Truth.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class OrderSubjectTest {
    @Test
    void failureMessageNamesTheOrderProperty() {
        var order = new Order("o-1", 1200, Order.Status.CONFIRMED, "pay-1");

        AssertionError failure = assertThrows(
            AssertionError.class,
            () -> OrderSubject.assertThat(order).hasTotal(999)
        );

        assertThat(failure).hasMessageThat().contains("total()");
        assertThat(failure).hasMessageThat().contains("999");
        assertThat(failure).hasMessageThat().contains("1200");
    }
}
