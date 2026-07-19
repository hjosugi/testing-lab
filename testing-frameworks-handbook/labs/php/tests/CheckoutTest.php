<?php

declare(strict_types=1);

namespace Handbook\Checkout\Tests;

use Handbook\Checkout\CartItem;
use Handbook\Checkout\CheckoutService;
use Handbook\Checkout\Order;
use Handbook\Checkout\OrderRepository;
use Handbook\Checkout\PaymentGateway;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class FakePayments implements PaymentGateway
{
    /** @var list<array{amount: int, token: string}> */
    public array $captured = [];

    public function capture(int $amount, string $token): string
    {
        $this->captured[] = ['amount' => $amount, 'token' => $token];
        return 'pay-1';
    }
}

final class MemoryOrders implements OrderRepository
{
    /** @var list<Order> */
    public array $saved = [];

    public function save(Order $order): void
    {
        $this->saved[] = $order;
    }
}

final class CheckoutTest extends TestCase
{
    /** @return iterable<string, array{list<CartItem>, int}> */
    public static function carts(): iterable
    {
        yield 'one item type' => [[new CartItem('book', 2, 600)], 1_200];
        yield 'two item types' => [[new CartItem('a', 1, 100), new CartItem('b', 3, 50)], 250];
    }

    #[DataProvider('carts')]
    public function testClassicalObservableState(array $items, int $expected): void
    {
        $payments = new FakePayments();
        $orders = new MemoryOrders();
        $result = (new CheckoutService($payments, $orders))->checkout('o-1', $items, 't-1');

        self::assertSame($expected, $result->total);
        self::assertSame('CONFIRMED', $result->status);
        self::assertSame('pay-1', $result->paymentId);
        self::assertSame([['amount' => $expected, 'token' => 't-1']], $payments->captured);
        self::assertSame([$result], $orders->saved);
    }

    public function testLondonInteractionProtocol(): void
    {
        $payments = $this->createMock(PaymentGateway::class);
        $orders = $this->createMock(OrderRepository::class);
        $payments->expects(self::once())->method('capture')->with(1_200, 't-1')->willReturn('pay-42');
        $orders->expects(self::once())->method('save')->with(self::callback(
            static fn(Order $order): bool =>
                $order->status === 'CONFIRMED'
                && $order->total === 1_200
                && $order->paymentId === 'pay-42'
        ));

        (new CheckoutService($payments, $orders))->checkout(
            'o-1',
            [new CartItem('book', 2, 600)],
            't-1',
        );
    }

    /** @return iterable<string, array{CartItem}> */
    public static function invalidItems(): iterable
    {
        yield 'zero quantity' => [new CartItem('book', 0, 600)];
        yield 'negative quantity' => [new CartItem('book', -1, 600)];
        yield 'negative unit price' => [new CartItem('book', 1, -1)];
    }

    #[DataProvider('invalidItems')]
    public function testSubtotalRejectsInvalidItems(CartItem $item): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('invalid item');

        $item->subtotal();
    }

    public function testZeroUnitPriceIsAllowed(): void
    {
        self::assertSame(0, (new CartItem('free-sample', 1, 0))->subtotal());
    }

    public function testEmptyCartIsRejectedBeforeCollaboratorsRun(): void
    {
        $payments = $this->createMock(PaymentGateway::class);
        $orders = $this->createMock(OrderRepository::class);
        $payments->expects(self::never())->method('capture');
        $orders->expects(self::never())->method('save');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('cart must not be empty');

        (new CheckoutService($payments, $orders))->checkout('o-empty', [], 't-1');
    }
}
