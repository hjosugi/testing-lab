package handbook.checkout;

import static com.google.common.truth.Truth.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class MockitoAgentTest {
    @Test
    void inlineMockMakerCanMockTheFinalOrderRecord() {
        Order order = mock(Order.class);
        when(order.total()).thenReturn(1200);
        when(order.status()).thenReturn(Order.Status.CONFIRMED);

        assertThat(order.total()).isEqualTo(1200);
        assertThat(order.status()).isEqualTo(Order.Status.CONFIRMED);
    }
}
