package handbook.checkout;

public record Order(String orderId, int total, Status status, String paymentId) {
    public enum Status { CONFIRMED }
}

