#include "checkout.hpp"

#include <catch2/benchmark/catch_benchmark.hpp>
#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>

#include <numeric>

struct FakePayments : PaymentGateway {
  std::vector<int> captured;
  std::string capture(int amount, const std::string &) override {
    captured.push_back(amount);
    return "pay-1";
  }
};

struct MemoryOrders : OrderRepository {
  std::vector<Order> saved;
  void save(const Order &order) override { saved.push_back(order); }
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

TEST_CASE("SECTION paths restart setup for every generated value",
          "[section][generator]") {
  const auto quantity = GENERATE(1, 2);
  int path_local_total = 0;

  SECTION("valid item path") {
    path_local_total += Item{"book", quantity, 600}.subtotal();
    REQUIRE(path_local_total == quantity * 600);
  }

  SECTION("invalid item path starts from a fresh setup") {
    REQUIRE(path_local_total == 0);
    REQUIRE_THROWS_AS((Item{"book", 0, 600}.subtotal()), std::invalid_argument);
  }
}

TEST_CASE("London-style spies verify the protocol", "[london]") {
  FakePayments payments;
  MemoryOrders orders;
  CheckoutService service(payments, orders);

  const auto result = service.checkout("o-1", {{"book", 2, 600}}, "t-1");

  REQUIRE(payments.captured == std::vector<int>{1200});
  REQUIRE(orders.saved == std::vector<Order>{result});
}

TEST_CASE("Cart subtotal microbenchmark keeps a correctness oracle",
          "[!benchmark][benchmark]") {
  std::vector<Item> items;
  items.reserve(100);
  for (int index = 0; index < 100; ++index) {
    items.push_back({"sku-" + std::to_string(index), index % 4 + 1, 125});
  }

  const auto sum_subtotals = [&items] {
    return std::accumulate(
        items.begin(), items.end(), 0,
        [](int total, const Item &item) { return total + item.subtotal(); });
  };

  BENCHMARK("sum 100 CartItem subtotals") { return sum_subtotals(); };

  REQUIRE(sum_subtotals() == 31'250);
}
