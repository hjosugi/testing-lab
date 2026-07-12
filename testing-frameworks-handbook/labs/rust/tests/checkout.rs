use rstest::rstest;
use testing_handbook_checkout::{checkout, Item, Order, OrderRepository, PaymentGateway};

#[derive(Default)]
struct FakePayments { captured: Vec<u64> }
impl PaymentGateway for FakePayments {
    type Error = &'static str;
    fn capture(&mut self, amount: u64, _token: &str) -> Result<String, Self::Error> {
        self.captured.push(amount);
        Ok("pay-1".into())
    }
}

#[derive(Default)]
struct MemoryOrders { saved: Vec<Order> }
impl OrderRepository for MemoryOrders {
    type Error = &'static str;
    fn save(&mut self, order: &Order) -> Result<(), Self::Error> {
        self.saved.push(order.clone());
        Ok(())
    }
}

#[rstest]
#[case(vec![Item { sku: "book".into(), quantity: 2, unit_price: 600 }], 1200)]
#[case(vec![
    Item { sku: "a".into(), quantity: 1, unit_price: 100 },
    Item { sku: "b".into(), quantity: 3, unit_price: 50 },
], 250)]
fn classical_observable_outcome(#[case] items: Vec<Item>, #[case] expected: u64) {
    let (mut payments, mut orders) = (FakePayments::default(), MemoryOrders::default());
    let result = checkout(&mut payments, &mut orders, "o-1", &items, "t-1").unwrap();
    assert_eq!(result.total, expected);
    assert_eq!(orders.saved, vec![result]);
}

#[test]
fn london_style_protocol_is_recorded_by_spies() {
    let (mut payments, mut orders) = (FakePayments::default(), MemoryOrders::default());
    let result = checkout(
        &mut payments, &mut orders, "o-1",
        &[Item { sku: "book".into(), quantity: 2, unit_price: 600 }], "t-1"
    ).unwrap();
    assert_eq!(payments.captured, vec![1200]);
    assert_eq!(orders.saved, vec![result]);
}

