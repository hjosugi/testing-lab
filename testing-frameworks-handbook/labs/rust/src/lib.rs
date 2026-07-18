//! Checkout domain used to compare Rust test boundaries.
//!
//! Public examples are compiled as doctests:
//!
//! ```
//! use testing_handbook_checkout::{total, Item};
//!
//! let items = vec![Item {
//!     sku: "book".into(),
//!     quantity: 2,
//!     unit_price: 600,
//! }];
//! assert_eq!(total(&items), Ok(1_200));
//! ```
//!
//! A local `Rc<RefCell<_>>` double satisfies the collaborator trait, but it
//! cannot be moved to another thread because it is not `Send`:
//!
//! ```compile_fail
//! use std::{cell::RefCell, rc::Rc};
//! use testing_handbook_checkout::PaymentGateway;
//!
//! struct LocalPayments(Rc<RefCell<Vec<u64>>>);
//!
//! impl PaymentGateway for LocalPayments {
//!     type Error = &'static str;
//!
//!     fn capture(&mut self, amount: u64, _token: &str) -> Result<String, Self::Error> {
//!         self.0.borrow_mut().push(amount);
//!         Ok("pay-local".into())
//!     }
//! }
//!
//! fn require_send<T: Send>() {}
//! require_send::<LocalPayments>();
//! ```

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Item {
    pub sku: String,
    pub quantity: u32,
    pub unit_price: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Order {
    pub id: String,
    pub total: u64,
    pub status: &'static str,
    pub payment_id: String,
}

pub trait PaymentGateway {
    type Error;

    fn capture(&mut self, amount: u64, token: &str) -> Result<String, Self::Error>;
}

pub trait OrderRepository {
    type Error;

    fn save(&mut self, order: &Order) -> Result<(), Self::Error>;
}

fn checked_subtotal(item: &Item) -> Result<u64, &'static str> {
    if item.quantity == 0 {
        return Err("quantity must be positive");
    }
    Ok(u64::from(item.quantity) * u64::from(item.unit_price))
}

/// Calculates the cart total without silently wrapping `u64`.
///
/// The public behavior is exercised from `tests/`, while the private
/// `checked_subtotal` helper is exercised by the in-module unit tests below.
pub fn total(items: &[Item]) -> Result<u64, &'static str> {
    if items.is_empty() {
        return Err("cart must not be empty");
    }
    items.iter().try_fold(0_u64, |sum, item| {
        sum.checked_add(checked_subtotal(item)?).ok_or("overflow")
    })
}

pub fn checkout<P, R>(
    payments: &mut P,
    orders: &mut R,
    id: &str,
    items: &[Item],
    token: &str,
) -> Result<Order, &'static str>
where
    P: PaymentGateway<Error = &'static str>,
    R: OrderRepository<Error = &'static str>,
{
    let amount = total(items)?;
    let payment_id = payments.capture(amount, token)?;
    let order = Order {
        id: id.into(),
        total: amount,
        status: "CONFIRMED",
        payment_id,
    };
    orders.save(&order)?;
    Ok(order)
}

#[cfg(test)]
mod unit_tests {
    use super::{Item, checked_subtotal};

    #[test]
    fn private_subtotal_rejects_zero_quantity() {
        let item = Item {
            sku: "invalid".into(),
            quantity: 0,
            unit_price: 600,
        };

        assert_eq!(checked_subtotal(&item), Err("quantity must be positive"));
    }

    #[test]
    fn private_subtotal_widens_before_multiplication() {
        let item = Item {
            sku: "maximum".into(),
            quantity: u32::MAX,
            unit_price: u32::MAX,
        };

        assert_eq!(
            checked_subtotal(&item),
            Ok(u64::from(u32::MAX) * u64::from(u32::MAX))
        );
    }
}
