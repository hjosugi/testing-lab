#pragma once

#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

struct Item {
  std::string sku;
  int quantity;
  int unit_price;
  int subtotal() const {
    if (quantity <= 0 || unit_price < 0) throw std::invalid_argument("invalid item");
    return quantity * unit_price;
  }
};

struct Order {
  std::string id;
  int total;
  std::string status;
  std::string payment_id;
  bool operator==(const Order&) const = default;
};

struct PaymentGateway {
  virtual ~PaymentGateway() = default;
  virtual std::string capture(int amount, const std::string& token) = 0;
};

struct OrderRepository {
  virtual ~OrderRepository() = default;
  virtual void save(const Order& order) = 0;
};

class CheckoutService {
 public:
  CheckoutService(PaymentGateway& payments, OrderRepository& orders)
      : payments_(payments), orders_(orders) {}

  Order checkout(std::string id, const std::vector<Item>& items, const std::string& token) {
    if (items.empty()) throw std::invalid_argument("cart must not be empty");
    int total = 0;
    for (const auto& item : items) total += item.subtotal();
    Order order{std::move(id), total, "CONFIRMED", payments_.capture(total, token)};
    orders_.save(order);
    return order;
  }

 private:
  PaymentGateway& payments_;
  OrderRepository& orders_;
};

