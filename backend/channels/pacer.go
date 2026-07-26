package channels

import (
	"context"
	"sync"
	"time"
)

// pacer enforces a minimum interval between outbound requests.
//
// Pancake limits public API calls to 5 per page per second and exposes no
// quota headers (no X-RateLimit-*, no Retry-After), so self-throttling is the
// only way to stay under the limit.
type pacer struct {
	mu       sync.Mutex
	interval time.Duration
	next     time.Time
}

func newPacer(interval time.Duration) *pacer {
	return &pacer{interval: interval}
}

// wait blocks until this caller's slot arrives, or ctx is done.
func (p *pacer) wait(ctx context.Context) error {
	p.mu.Lock()
	now := time.Now()
	if p.next.Before(now) {
		p.next = now
	}
	slot := p.next
	p.next = p.next.Add(p.interval)
	p.mu.Unlock()

	delay := time.Until(slot)
	if delay <= 0 {
		return nil
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
