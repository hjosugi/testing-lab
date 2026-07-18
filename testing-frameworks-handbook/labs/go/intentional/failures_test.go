//go:build intentional

package intentional

import (
	"runtime"
	"sync"
	"testing"

	"go.uber.org/goleak"
)

func TestDataRace(t *testing.T) {
	var value int
	start := make(chan struct{})
	var workers sync.WaitGroup
	workers.Add(2)

	for delta := 1; delta <= 2; delta++ {
		go func(delta int) {
			defer workers.Done()
			<-start
			for range 10_000 {
				value += delta
			}
		}(delta)
	}

	close(start)
	workers.Wait()
	runtime.KeepAlive(value)
}

func TestGoroutineLeak(t *testing.T) {
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())

	started := make(chan struct{})
	go func() {
		close(started)
		select {}
	}()
	<-started
}

var orderState = "clean"

func TestOrderDependentAssumesCleanState(t *testing.T) {
	if orderState != "clean" {
		t.Fatalf("order dependence detected: shared state=%q", orderState)
	}
}

func TestOrderDependentMutatesSharedState(t *testing.T) {
	orderState = "dirty"
}
