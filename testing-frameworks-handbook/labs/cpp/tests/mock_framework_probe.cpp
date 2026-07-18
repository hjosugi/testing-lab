#include "checkout.hpp"

#include <trompeloeil.hpp>

#include <string>

struct MockPayments : PaymentGateway {
  MAKE_MOCK2(capture, std::string(int, const std::string &), override);
};

struct MockOrders : OrderRepository {
  MAKE_MOCK1(save, void(const Order &), override);
};

int main() {
  MockPayments payments;
  MockOrders orders;
  REQUIRE_CALL(payments, capture(1200, "t-1")).RETURN("pay-1");
  REQUIRE_CALL(orders, save(trompeloeil::_));

  const auto result = CheckoutService(payments, orders)
                          .checkout("o-1", {{"book", 2, 600}}, "t-1");

  return result.total == 1200 ? 0 : 1;
}
