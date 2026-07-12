<?php

declare(strict_types=1);

namespace Handbook\Checkout\Tests;

use Handbook\Checkout\CartItem;
use Handbook\Checkout\CheckoutService;
use Handbook\Checkout\Order;
use Handbook\Checkout\OrderRepository;
use Handbook\Checkout\PaymentGateway;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class FakePayments implements PaymentGateway
{
    /** @var list<int> */ public array $captured = [];
    public function capture(int $amount, string $token): string
    {
        $this->captured[] = $amount;
        return 'pay-1';
    }
}

final class MemoryOrders implements OrderRepository
{
    /** @var list<Order> */ public array $saved = [];
    public function save(Order $order): void { $this->saved[] = $order; }
}

final class CheckoutTest extends TestCase
{
    public static function carts(): iterable
    {
        yield 'one item type' => [[new CartItem('book', 2, 600)], 1200];
        yield 'two item types' => [[new CartItem('a', 1, 100), new CartItem('b', 3, 50)], 250];
    }

    #[DataProvider('carts')]
    public function testClassicalObservableState(array $items, int $expected): void
    {
        $payments = new FakePayments();
        $orders = new MemoryOrders();
        $result = (new CheckoutService($payments, $orders))->checkout('o-1', $items, 't-1');

        self::assertSame($expected, $result->total);
        self::assertEquals([$result], $orders->saved);
    }

    public function testLondonInteractionProtocol(): void
    {
        $payments = $this->createMock(PaymentGateway::class);
        $orders = $this->createMock(OrderRepository::class);
        $payments->expects(self::once())->method('capture')->with(1200, 't-1')->willReturn('pay-42');
        $orders->expects(self::once())->method('save')->with(self::callback(
            static fn(Order $order): bool => $order->status === 'CONFIRMED' && $order->total === 1200
        ));

        (new CheckoutService($payments, $orders))->checkout(
            'o-1', [new CartItem('book', 2, 600)], 't-1'
        );
    }
}

