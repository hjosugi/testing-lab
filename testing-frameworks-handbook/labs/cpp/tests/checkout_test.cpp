#include "checkout.hpp"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>

struct FakePayments : PaymentGateway {
  std::vector<int> captured;
  std::string capture(int amount, const std::string&) override {
    captured.push_back(amount);
    return "pay-1";
  }
};

struct MemoryOrders : OrderRepository {
  std::vector<Order> saved;
  void save(const Order& order) override { saved.push_back(order); }
};

TEST_CASE("Classical checkout verifies observable state", "[classical]") {
  const auto quantity = GENERATE(1, 2, 3);
  FakePayments payments;
  MemoryOrders orders;
  CheckoutService service(payments, orders);

  const auto result = service.checkout("o-1", {{"book", quantity, 600}}, "t-1");

  REQUIRE(result.total == quantity * 600);
  REQUIRE(orders.saved == std::vector<Order>{result});
}

TEST_CASE("London-style spies verify the protocol", "[london]") {
  FakePayments payments;
  MemoryOrders orders;
  CheckoutService service(payments, orders);

  const auto result = service.checkout("o-1", {{"book", 2, 600}}, "t-1");

  REQUIRE(payments.captured == std::vector<int>{1200});
  REQUIRE(orders.saved == std::vector<Order>{result});
}

