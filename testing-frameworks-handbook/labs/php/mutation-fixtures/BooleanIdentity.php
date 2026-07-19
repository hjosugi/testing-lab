<?php

declare(strict_types=1);

namespace Handbook\Checkout\MutationFixture;

/**
 * Deliberate equivalent-mutant fixture, kept outside the high-risk source gate.
 *
 * The bool parameter already limits the input domain to true/false, so removing
 * the bool cast cannot change the result. See MUTATION_CLASSIFICATION.md.
 */
final class BooleanIdentity
{
    public static function normalize(bool $value): mixed
    {
        return (bool) $value;
    }
}
