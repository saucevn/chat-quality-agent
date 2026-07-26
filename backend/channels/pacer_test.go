package channels

import (
	"context"
	"testing"
	"time"
)

func TestPacerSpacesRequests(t *testing.T) {
	p := newPacer(20 * time.Millisecond)

	start := time.Now()
	for i := 0; i < 3; i++ {
		if err := p.wait(context.Background()); err != nil {
			t.Fatalf("wait #%d returned error: %v", i, err)
		}
	}
	elapsed := time.Since(start)

	// slot 1 is immediate; slots 2 and 3 each wait one interval
	if elapsed < 40*time.Millisecond {
		t.Errorf("3 paced calls should take >= 40ms, took %v", elapsed)
	}
}

func TestPacerRespectsContextCancellation(t *testing.T) {
	p := newPacer(time.Hour)

	if err := p.wait(context.Background()); err != nil {
		t.Fatalf("first wait should be immediate, got: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	if err := p.wait(ctx); err == nil {
		t.Error("expected an error when context expires while waiting for a slot")
	}
}
