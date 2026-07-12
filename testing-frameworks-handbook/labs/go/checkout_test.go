package checkout

import (
	"errors"
	"reflect"
	"testing"
)

type fakePayments struct { calls []int; fail bool }
func (f *fakePayments) Capture(amount int, token string) (string, error) {
	if f.fail { return "", errors.New("declined") }
	f.calls = append(f.calls, amount)
	return "pay-1", nil
}

type memoryOrders struct { saved []Order }
func (m *memoryOrders) Save(order Order) error { m.saved = append(m.saved, order); return nil }

func TestCheckoutClassical(t *testing.T) {
	t.Parallel()
	cases := []struct { name string; items []Item; want int }{
		{"one item type", []Item{{"book", 2, 600}}, 1200},
		{"two item types", []Item{{"a", 1, 100}, {"b", 3, 50}}, 250},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			payments, orders := &fakePayments{}, &memoryOrders{}
			got, err := NewService(payments, orders).Checkout("o-1", tc.items, "t-1")
			if err != nil { t.Fatal(err) }
			if got.Total != tc.want { t.Fatalf("total=%d, want %d", got.Total, tc.want) }
			if !reflect.DeepEqual(orders.saved, []Order{got}) { t.Fatalf("saved=%v", orders.saved) }
		})
	}
}

func TestCheckoutLondonStyleProtocol(t *testing.T) {
	payments, orders := &fakePayments{}, &memoryOrders{}
	got, err := NewService(payments, orders).Checkout("o-1", []Item{{"book", 2, 600}}, "t-1")
	if err != nil { t.Fatal(err) }
	if !reflect.DeepEqual(payments.calls, []int{1200}) { t.Fatalf("capture calls=%v", payments.calls) }
	if !reflect.DeepEqual(orders.saved, []Order{got}) { t.Fatalf("save calls=%v", orders.saved) }
}

func FuzzTotal(f *testing.F) {
	f.Add(2, 600)
	f.Fuzz(func(t *testing.T, quantity, unitPrice int) {
		if quantity <= 0 || unitPrice < 0 || quantity > 1_000_000 || unitPrice > 1_000_000 { t.Skip() }
		got, err := Total([]Item{{"sku", quantity, unitPrice}})
		if err != nil { t.Fatal(err) }
		if got != quantity*unitPrice { t.Fatalf("got %d", got) }
	})
}

