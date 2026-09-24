# Example mapping: EXAMPLE-MAPPING.md (story CHK-42)
Feature: Coupons at checkout
  Customers can reduce what they pay for items with a coupon,
  without the shop losing money on shipping or giving items away.

  Background:
    Given the coupon "SPRING10" takes 10% off items
    And "SPRING10" needs an item subtotal of at least 3000 yen
    And "SPRING10" is valid until 2026-10-31

  @R1 @AC-1
  Rule: Percentage coupons reduce the item subtotal, never shipping

    Scenario Outline: Discount is taken from items only
      Given a customer with items worth <items> yen and shipping of <shipping> yen
      When they use "SPRING10" on 2026-10-01
      Then they pay <total> yen

      Examples:
        | items | shipping | total |
        | 3000  | 500      | 3200  |
        | 12345 | 0        | 11111 |

  @R2 @AC-2
  Rule: A coupon needs a minimum item subtotal

    Scenario: Just below the minimum
      Given a customer with items worth 2999 yen and shipping of 500 yen
      When they use "SPRING10" on 2026-10-01
      Then the coupon is refused because the subtotal is below the minimum
      And they pay 3499 yen

  @R3 @AC-3
  Rule: A customer can use a coupon only once

    Scenario: Second use by the same customer
      Given a customer who already used "SPRING10"
      And a customer with items worth 5000 yen and shipping of 0 yen
      When they use "SPRING10" on 2026-10-01
      Then the coupon is refused because it was already used

  @R4 @AC-4
  Rule: Expired coupons are refused, but the expiry day still counts

    Scenario Outline: Around the expiry date
      Given a customer with items worth 4000 yen and shipping of 0 yen
      When they use "SPRING10" on <day>
      Then <outcome>

      Examples:
        | day        | outcome                                         |
        | 2026-10-31 | they pay 3600 yen                               |
        | 2026-11-01 | the coupon is refused because it has expired    |

  @R5 @AC-5
  Rule: A fixed coupon never makes items free of charge below zero

    Scenario: Fixed coupon larger than the items
      Given the coupon "WELCOME5000" takes 5000 yen off items
      And "WELCOME5000" needs an item subtotal of at least 0 yen
      And "WELCOME5000" is valid until 2026-12-31
      And a customer with items worth 1200 yen and shipping of 700 yen
      When they use "WELCOME5000" on 2026-10-01
      Then they pay 700 yen
