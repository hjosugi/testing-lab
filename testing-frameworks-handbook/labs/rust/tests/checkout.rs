use rstest::{fixture, rstest};
use testing_handbook_checkout::{Item, Order, OrderRepository, PaymentGateway, checkout, total};

#[derive(Default)]
struct FakePayments {
    captured: Vec<u64>,
}

impl PaymentGateway for FakePayments {
    type Error = &'static str;

    fn capture(&mut self, amount: u64, _token: &str) -> Result<String, Self::Error> {
        self.captured.push(amount);
        Ok("pay-1".into())
    }
}

#[derive(Default)]
struct MemoryOrders {
    saved: Vec<Order>,
}

impl OrderRepository for MemoryOrders {
    type Error = &'static str;

    fn save(&mut self, order: &Order) -> Result<(), Self::Error> {
        self.saved.push(order.clone());
        Ok(())
    }
}

#[fixture]
fn payments() -> FakePayments {
    FakePayments::default()
}

#[fixture]
fn orders() -> MemoryOrders {
    MemoryOrders::default()
}

#[rstest]
#[case(vec![Item {
    sku: "book".into(),
    quantity: 2,
    unit_price: 600,
}], 1_200)]
#[case(vec![
    Item {
        sku: "a".into(),
        quantity: 1,
        unit_price: 100,
    },
    Item {
        sku: "b".into(),
        quantity: 3,
        unit_price: 50,
    },
], 250)]
fn classical_observable_outcome(
    #[case] items: Vec<Item>,
    #[case] expected: u64,
    mut payments: FakePayments,
    mut orders: MemoryOrders,
) {
    let result = checkout(&mut payments, &mut orders, "o-1", &items, "token-1").unwrap();

    assert_eq!(result.total, expected);
    assert_eq!(orders.saved, vec![result]);
}

#[rstest]
fn london_style_protocol_is_recorded_by_spies(
    mut payments: FakePayments,
    mut orders: MemoryOrders,
) {
    let result = checkout(
        &mut payments,
        &mut orders,
        "o-1",
        &[Item {
            sku: "book".into(),
            quantity: 2,
            unit_price: 600,
        }],
        "token-1",
    )
    .unwrap();

    assert_eq!(payments.captured, vec![1_200]);
    assert_eq!(orders.saved, vec![result]);
}

#[rstest]
#[case(Vec::new(), "cart must not be empty")]
#[case(
    vec![Item {
        sku: "invalid".into(),
        quantity: 0,
        unit_price: 600,
    }],
    "quantity must be positive"
)]
fn public_total_rejects_invalid_carts(#[case] items: Vec<Item>, #[case] expected: &'static str) {
    assert_eq!(total(&items), Err(expected));
}

#[test]
fn public_total_rejects_accumulation_overflow() {
    let maximum = Item {
        sku: "maximum".into(),
        quantity: u32::MAX,
        unit_price: u32::MAX,
    };

    assert_eq!(total(&[maximum.clone(), maximum]), Err("overflow"));
}
