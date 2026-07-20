package checkout

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"go.uber.org/mock/gomock"
)

type fakePayments struct {
	calls []int
	fail  bool
}

func (f *fakePayments) Capture(amount int, token string) (string, error) {
	if f.fail {
		return "", errors.New("declined")
	}
	f.calls = append(f.calls, amount)
	return "pay-1", nil
}

type memoryOrders struct {
	saved []Order
}

func (m *memoryOrders) Save(order Order) error {
	m.saved = append(m.saved, order)
	return nil
}

type fileOrders struct {
	path string
}

func (f *fileOrders) Save(order Order) error {
	data, err := json.Marshal(order)
	if err != nil {
		return err
	}
	return os.WriteFile(f.path, data, 0o600)
}

func TestCheckoutClassical(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name  string
		items []Item
		want  int
	}{
		{"one item type", []Item{{SKU: "book", Quantity: 2, UnitPrice: 600}}, 1200},
		{"two item types", []Item{{SKU: "a", Quantity: 1, UnitPrice: 100}, {SKU: "b", Quantity: 3, UnitPrice: 50}}, 250},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			payments, orders := &fakePayments{}, &memoryOrders{}
			got, err := NewService(payments, orders).Checkout("o-1", tc.items, "t-1")
			if err != nil {
				t.Fatal(err)
			}
			if got.Total != tc.want {
				t.Fatalf("total=%d, want %d", got.Total, tc.want)
			}
			if !reflect.DeepEqual(orders.saved, []Order{got}) {
				t.Fatalf("saved=%v", orders.saved)
			}
		})
	}
}

func TestCheckoutParallelResourceIsolation(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name  string
		order string
	}{
		{name: "first parallel checkout", order: "parallel-1"},
		{name: "second parallel checkout", order: "parallel-2"},
		{name: "third parallel checkout", order: "parallel-3"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			// Every subtest intentionally uses the same filename, but t.TempDir
			// gives it an isolated filesystem boundary.
			orderPath := filepath.Join(t.TempDir(), "order.json")
			got, err := NewService(&fakePayments{}, &fileOrders{path: orderPath}).Checkout(
				tc.order,
				[]Item{{SKU: "book", Quantity: 2, UnitPrice: 600}},
				"t-1",
			)
			if err != nil {
				t.Fatal(err)
			}

			data, err := os.ReadFile(orderPath)
			if err != nil {
				t.Fatal(err)
			}
			var saved Order
			if err := json.Unmarshal(data, &saved); err != nil {
				t.Fatal(err)
			}
			if saved != got {
				t.Fatalf("saved=%+v, want %+v", saved, got)
			}
		})
	}
}

func TestCheckoutHandwrittenSpyProtocol(t *testing.T) {
	t.Parallel()
	payments, orders := &fakePayments{}, &memoryOrders{}
	got, err := NewService(payments, orders).Checkout(
		"o-1",
		[]Item{{SKU: "book", Quantity: 2, UnitPrice: 600}},
		"t-1",
	)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(payments.calls, []int{1200}) {
		t.Fatalf("capture calls=%v", payments.calls)
	}
	if !reflect.DeepEqual(orders.saved, []Order{got}) {
		t.Fatalf("save calls=%v", orders.saved)
	}
}

func TestCheckoutGeneratedMockProtocol(t *testing.T) {
	t.Parallel()
	payments := NewMockPaymentGateway(gomock.NewController(t))
	payments.EXPECT().Capture(1200, "t-1").Return("pay-generated", nil)
	orders := &memoryOrders{}

	got, err := NewService(payments, orders).Checkout(
		"o-1",
		[]Item{{SKU: "book", Quantity: 2, UnitPrice: 600}},
		"t-1",
	)
	if err != nil {
		t.Fatal(err)
	}
	if got.PaymentID != "pay-generated" {
		t.Fatalf("payment ID=%q, want pay-generated", got.PaymentID)
	}
	if !reflect.DeepEqual(orders.saved, []Order{got}) {
		t.Fatalf("save calls=%v", orders.saved)
	}
}

func TestCheckoutPaymentFailureDoesNotSave(t *testing.T) {
	t.Parallel()
	orders := &memoryOrders{}

	_, err := NewService(&fakePayments{fail: true}, orders).Checkout(
		"o-1",
		[]Item{{SKU: "book", Quantity: 1, UnitPrice: 600}},
		"t-1",
	)
	if err == nil {
		t.Fatal("expected declined payment")
	}
	if len(orders.saved) != 0 {
		t.Fatalf("saved after payment failure: %v", orders.saved)
	}
}

func TestParseItemLineExamples(t *testing.T) {
	t.Parallel()
	for _, testCase := range []struct {
		line string
		want Item
	}{
		{line: "BOOK|1|800", want: Item{SKU: "BOOK", Quantity: 1, UnitPrice: 800}},
		{line: "PEN|2|120", want: Item{SKU: "PEN", Quantity: 2, UnitPrice: 120}},
	} {
		got, err := ParseItemLine(testCase.line)
		if err != nil {
			t.Fatal(err)
		}
		if got != testCase.want {
			t.Fatalf("ParseItemLine(%q)=%+v, want %+v", testCase.line, got, testCase.want)
		}
	}
}

func FuzzTotal(f *testing.F) {
	f.Add(int64(2), int64(600))
	f.Fuzz(func(t *testing.T, quantity, unitPrice int64) {
		if quantity <= 0 || unitPrice < 0 {
			t.Skip()
		}

		maxInt := int64(^uint(0) >> 1)
		if quantity > maxInt || unitPrice > maxInt {
			t.Skip()
		}

		got, err := Total([]Item{{
			SKU:       "sku",
			Quantity:  int(quantity),
			UnitPrice: int(unitPrice),
		}})
		if unitPrice != 0 && quantity > maxInt/unitPrice {
			if !errors.Is(err, ErrTotalOverflow) {
				t.Fatalf("overflow input (%d, %d): err=%v", quantity, unitPrice, err)
			}
			return
		}
		if err != nil {
			t.Fatal(err)
		}
		if want := int(quantity * unitPrice); got != want {
			t.Fatalf("got %d, want %d", got, want)
		}
	})
}

func FuzzParseItemLine(f *testing.F) {
	f.Add("BOOK|1|800")
	f.Add("PEN|2|120")
	f.Add("broken")
	f.Fuzz(func(t *testing.T, line string) {
		item, err := ParseItemLine(line)
		if err != nil {
			if !errors.Is(err, ErrInvalidItemLine) {
				t.Fatalf("invalid input returned an unclassified error: %v", err)
			}
			return
		}

		encoded, err := FormatItemLine(item)
		if err != nil {
			t.Fatalf("accepted item cannot be encoded: %v", err)
		}
		roundTripped, err := ParseItemLine(encoded)
		if err != nil {
			t.Fatalf("encoded item cannot be parsed: %v", err)
		}
		if roundTripped != item {
			t.Fatalf("round trip=%+v, want %+v", roundTripped, item)
		}

		got, err := Total([]Item{item})
		if err != nil {
			t.Fatalf("accepted item cannot be totaled: %v", err)
		}
		want := item.Quantity * item.UnitPrice
		if got != want {
			t.Fatalf("parsed total=%d, want %d", got, want)
		}
	})
}

func BenchmarkTotal100Items(b *testing.B) {
	items := make([]Item, 100)
	for i := range items {
		items[i] = Item{SKU: "sku", Quantity: i + 1, UnitPrice: 25}
	}

	b.ReportAllocs()
	var result int
	for b.Loop() {
		got, err := Total(items)
		if err != nil {
			b.Fatal(err)
		}
		result = got
	}
	if result != 126250 {
		b.Fatalf("total=%d, want 126250", result)
	}
}
