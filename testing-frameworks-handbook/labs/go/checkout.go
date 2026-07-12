package checkout

import "errors"

var ErrEmptyCart = errors.New("cart must not be empty")

type Item struct {
	SKU       string
	Quantity  int
	UnitPrice int
}

type Order struct {
	ID        string
	Total     int
	Status    string
	PaymentID string
}

type PaymentGateway interface {
	Capture(amount int, token string) (string, error)
}

type OrderRepository interface {
	Save(order Order) error
}

type Service struct {
	payments PaymentGateway
	orders   OrderRepository
}

func NewService(payments PaymentGateway, orders OrderRepository) *Service {
	return &Service{payments: payments, orders: orders}
}

func Total(items []Item) (int, error) {
	if len(items) == 0 {
		return 0, ErrEmptyCart
	}
	total := 0
	for _, item := range items {
		if item.Quantity <= 0 || item.UnitPrice < 0 {
			return 0, errors.New("invalid item")
		}
		total += item.Quantity * item.UnitPrice
	}
	return total, nil
}

func (s *Service) Checkout(id string, items []Item, token string) (Order, error) {
	total, err := Total(items)
	if err != nil { return Order{}, err }
	paymentID, err := s.payments.Capture(total, token)
	if err != nil { return Order{}, err }
	order := Order{ID: id, Total: total, Status: "CONFIRMED", PaymentID: paymentID}
	if err := s.orders.Save(order); err != nil { return Order{}, err }
	return order, nil
}

