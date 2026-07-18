use std::{
    sync::{Arc, Mutex},
    thread,
};

use testing_handbook_checkout::{Item, Order, OrderRepository, PaymentGateway, checkout};

#[derive(Clone, Default)]
struct ThreadSafePayments {
    captured: Arc<Mutex<Vec<u64>>>,
}

impl PaymentGateway for ThreadSafePayments {
    type Error = &'static str;

    fn capture(&mut self, amount: u64, _token: &str) -> Result<String, Self::Error> {
        self.captured
            .lock()
            .map_err(|_| "payment lock poisoned")?
            .push(amount);
        Ok("pay-thread".into())
    }
}

#[derive(Clone, Default)]
struct ThreadSafeOrders {
    saved: Arc<Mutex<Vec<Order>>>,
}

impl OrderRepository for ThreadSafeOrders {
    type Error = &'static str;

    fn save(&mut self, order: &Order) -> Result<(), Self::Error> {
        self.saved
            .lock()
            .map_err(|_| "order lock poisoned")?
            .push(order.clone());
        Ok(())
    }
}

fn require_send_sync<T: Send + Sync>() {}

#[test]
fn arc_mutex_doubles_can_transfer_ownership_to_a_worker() {
    require_send_sync::<ThreadSafePayments>();
    require_send_sync::<ThreadSafeOrders>();

    let payments = ThreadSafePayments::default();
    let captured = Arc::clone(&payments.captured);
    let orders = ThreadSafeOrders::default();
    let saved = Arc::clone(&orders.saved);

    let order = thread::spawn(move || {
        let (mut payments, mut orders) = (payments, orders);
        checkout(
            &mut payments,
            &mut orders,
            "thread-order",
            &[Item {
                sku: "book".into(),
                quantity: 2,
                unit_price: 600,
            }],
            "token-1",
        )
    })
    .join()
    .expect("worker panicked")
    .expect("checkout failed");

    assert_eq!(*captured.lock().unwrap(), vec![1_200]);
    assert_eq!(*saved.lock().unwrap(), vec![order]);
}
