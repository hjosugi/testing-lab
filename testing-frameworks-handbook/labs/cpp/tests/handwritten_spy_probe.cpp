#include "checkout.hpp"

#include <string>
#include <vector>

struct SpyPayments : PaymentGateway {
  std::vector<int> captured;

  std::string capture(int amount, const std::string &) override {
    captured.push_back(amount);
    return "pay-1";
  }
};

struct SpyOrders : OrderRepository {
  std::vector<Order> saved;

  void save(const Order &order) override { saved.push_back(order); }
};

int main() {
  SpyPayments payments;
  SpyOrders orders;
  const auto result = CheckoutService(payments, orders)
                          .checkout("o-1", {{"book", 2, 600}}, "t-1");

  return result.total == 1200 && payments.captured == std::vector<int>{1200} &&
                 orders.saved == std::vector<Order>{result}
             ? 0
             : 1;
}
