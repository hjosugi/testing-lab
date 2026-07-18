package handbook.checkout;

import static com.google.common.truth.Truth.assertAbout;

import com.google.common.truth.FailureMetadata;
import com.google.common.truth.Subject;

public final class OrderSubject extends Subject {
    private final Order actual;

    private OrderSubject(FailureMetadata metadata, Order actual) {
        super(metadata, actual);
        this.actual = actual;
    }

    public static Factory<OrderSubject, Order> orders() {
        return OrderSubject::new;
    }

    public static OrderSubject assertThat(Order actual) {
        return assertAbout(orders()).that(actual);
    }

    public void hasTotal(int expected) {
        isNotNull();
        check("total()").that(actual.total()).isEqualTo(expected);
    }

    public void isConfirmed() {
        isNotNull();
        check("status()").that(actual.status()).isEqualTo(Order.Status.CONFIRMED);
    }

    public void hasPaymentId(String expected) {
        isNotNull();
        check("paymentId()").that(actual.paymentId()).isEqualTo(expected);
    }
}
