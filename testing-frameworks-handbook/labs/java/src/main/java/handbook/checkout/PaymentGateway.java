package handbook.checkout;

public interface PaymentGateway {
    String capture(int amount, String token);
}

