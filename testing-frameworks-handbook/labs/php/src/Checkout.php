<?php

declare(strict_types=1);

namespace Handbook\Checkout;

use InvalidArgumentException;

final readonly class CartItem
{
    public function __construct(
        public string $sku,
        public int $quantity,
        public int $unitPrice,
    ) {}

    public function subtotal(): int
    {
        if ($this->quantity <= 0 || $this->unitPrice < 0) {
            throw new InvalidArgumentException('invalid item');
        }
        return $this->quantity * $this->unitPrice;
    }
}

final readonly class Order
{
    public function __construct(
        public string $id,
        public int $total,
        public string $status,
        public string $paymentId,
    ) {}
}

interface PaymentGateway
{
    public function capture(int $amount, string $token): string;
}

interface OrderRepository
{
    public function save(Order $order): void;
}

final readonly class CheckoutService
{
    public function __construct(
        private PaymentGateway $payments,
        private OrderRepository $orders,
    ) {}

    /** @param list<CartItem> $items */
    public function checkout(string $id, array $items, string $token): Order
    {
        if ($items === []) throw new InvalidArgumentException('cart must not be empty');
        $total = array_sum(array_map(static fn(CartItem $item): int => $item->subtotal(), $items));
        $paymentId = $this->payments->capture($total, $token);
        $order = new Order($id, $total, 'CONFIRMED', $paymentId);
        $this->orders->save($order);
        return $order;
    }
}

