package checkout

import "errors"

var (
	ErrEmptyCart     = errors.New("cart must not be empty")
	ErrInvalidItem   = errors.New("invalid item")
	ErrTotalOverflow = errors.New("cart total overflows int")
)

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

//go:generate go tool mockgen -destination=mock_payment_gateway_test.go -package=checkout . PaymentGateway
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

	maxInt := int(^uint(0) >> 1)
	total := 0
	for _, item := range items {
		if item.Quantity <= 0 || item.UnitPrice < 0 {
			return 0, ErrInvalidItem
		}
		if item.UnitPrice != 0 && item.Quantity > maxInt/item.UnitPrice {
			return 0, ErrTotalOverflow
		}
		subtotal := item.Quantity * item.UnitPrice
		if total > maxInt-subtotal {
			return 0, ErrTotalOverflow
		}
		total += subtotal
	}
	return total, nil
}

func (s *Service) Checkout(id string, items []Item, token string) (Order, error) {
	total, err := Total(items)
	if err != nil {
		return Order{}, err
	}
	paymentID, err := s.payments.Capture(total, token)
	if err != nil {
		return Order{}, err
	}
	order := Order{ID: id, Total: total, Status: "CONFIRMED", PaymentID: paymentID}
	if err := s.orders.Save(order); err != nil {
		return Order{}, err
	}
	return order, nil
}
