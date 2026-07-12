package handbook.checkout;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LondonCheckoutTest {
    @Mock PaymentGateway payments;
    @Mock OrderRepository orders;
    @InjectMocks CheckoutService service;

    @Test
    void sendsTheImportantMessagesToCollaborators() {
        when(payments.capture(1200, "t-1")).thenReturn("pay-42");

        Order result = service.checkout("o-1", List.of(new CartItem("book", 2, 600)), "t-1");

        verify(payments).capture(1200, "t-1");
        verify(orders).save(result);
    }

    @Test
    void emptyCartDoesNotContactCollaborators() {
        try { service.checkout("o-1", List.of(), "t-1"); } catch (IllegalArgumentException ignored) { }
        verifyNoInteractions(payments, orders);
    }
}

