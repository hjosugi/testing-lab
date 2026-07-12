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

pub fn total(items: &[Item]) -> Result<u64, &'static str> {
    if items.is_empty() { return Err("cart must not be empty"); }
    items.iter().try_fold(0_u64, |sum, item| {
        if item.quantity == 0 { return Err("quantity must be positive"); }
        sum.checked_add(u64::from(item.quantity) * u64::from(item.unit_price)).ok_or("overflow")
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
    let order = Order { id: id.into(), total: amount, status: "CONFIRMED", payment_id };
    orders.save(&order)?;
    Ok(order)
}

