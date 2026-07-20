package checkout

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

var ErrInvalidItemLine = errors.New("invalid item line")

func validSKU(sku string) bool {
	if sku == "" || len(sku) > 32 || !utf8.ValidString(sku) {
		return false
	}
	for _, character := range sku {
		if !unicode.IsLetter(character) && !unicode.IsDigit(character) && character != '-' && character != '_' {
			return false
		}
	}
	return true
}

// ParseItemLine parses the compact wire form "sku|quantity|unit-price".
func ParseItemLine(line string) (Item, error) {
	if !utf8.ValidString(line) {
		return Item{}, fmt.Errorf("%w: input is not UTF-8", ErrInvalidItemLine)
	}
	fields := strings.Split(line, "|")
	if len(fields) != 3 || !validSKU(fields[0]) {
		return Item{}, fmt.Errorf("%w: expected sku|quantity|unit-price", ErrInvalidItemLine)
	}
	quantity, err := strconv.Atoi(fields[1])
	if err != nil {
		return Item{}, fmt.Errorf("%w: quantity: %v", ErrInvalidItemLine, err)
	}
	unitPrice, err := strconv.Atoi(fields[2])
	if err != nil {
		return Item{}, fmt.Errorf("%w: unit price: %v", ErrInvalidItemLine, err)
	}
	item := Item{SKU: fields[0], Quantity: quantity, UnitPrice: unitPrice}
	if _, err := Total([]Item{item}); err != nil {
		return Item{}, fmt.Errorf("%w: %v", ErrInvalidItemLine, err)
	}
	return item, nil
}

func FormatItemLine(item Item) (string, error) {
	if !validSKU(item.SKU) {
		return "", fmt.Errorf("%w: invalid SKU", ErrInvalidItemLine)
	}
	if _, err := Total([]Item{item}); err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidItemLine, err)
	}
	return fmt.Sprintf("%s|%d|%d", item.SKU, item.Quantity, item.UnitPrice), nil
}
