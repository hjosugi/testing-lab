<?php

declare(strict_types=1);

namespace Handbook\Checkout\Tests;

use Handbook\Checkout\MutationFixture\BooleanIdentity;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class EquivalentMutantTest extends TestCase
{
    /** @return iterable<string, array{bool}> */
    public static function booleans(): iterable
    {
        yield 'true' => [true];
        yield 'false' => [false];
    }

    #[DataProvider('booleans')]
    public function testBooleanIdentityCoversTheCompleteInputDomain(bool $value): void
    {
        self::assertSame($value, BooleanIdentity::normalize($value));
    }
}
