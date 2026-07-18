use proptest::prelude::*;
use testing_handbook_checkout::{Item, total};

fn item_strategy() -> impl Strategy<Value = Item> {
    (1_u32..=1_000_000, 0_u32..=1_000_000).prop_map(|(quantity, unit_price)| Item {
        sku: format!("sku-{quantity}-{unit_price}"),
        quantity,
        unit_price,
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(256))]

    #[test]
    fn total_matches_reference_and_is_order_independent(
        mut items in prop::collection::vec(item_strategy(), 1..=32)
    ) {
        let expected = items
            .iter()
            .map(|item| u64::from(item.quantity) * u64::from(item.unit_price))
            .sum::<u64>();

        prop_assert_eq!(total(&items), Ok(expected));
        items.reverse();
        prop_assert_eq!(total(&items), Ok(expected));
    }
}
