package engine

import (
	"testing"
	"time"
)

// A failed sync must not advance the data watermark. Before this was split out,
// updateSyncStatus wrote last_sync_at on every outcome, so the next run started
// after the window that had just failed and every message that arrived during
// the outage was skipped forever, with no error surfaced.
//
// Observed in the wild: after a few failed syncs of a Pancake channel, the next
// successful run pulled 4 conversations instead of 40. Clearing last_sync_at by
// hand and re-syncing returned all 40.
func TestSyncStatusUpdatesOnlyAdvancesWatermarkOnSuccess(t *testing.T) {
	now := time.Date(2026, 7, 26, 21, 25, 29, 0, time.UTC)

	t.Run("failure leaves the watermark alone", func(t *testing.T) {
		u := syncStatusUpdates("error", "fetch conversations failed: boom", now)

		if _, ok := u["last_sync_at"]; ok {
			t.Error("a failed sync must not touch last_sync_at — doing so silently skips the failed window")
		}
		if u["last_sync_status"] != "error" {
			t.Errorf("last_sync_status = %v, want error", u["last_sync_status"])
		}
		if u["last_sync_error"] != "fetch conversations failed: boom" {
			t.Errorf("last_sync_error = %v", u["last_sync_error"])
		}
	})

	t.Run("failure still records the attempt", func(t *testing.T) {
		u := syncStatusUpdates("error", "boom", now)

		got, ok := u["last_sync_attempt_at"].(*time.Time)
		if !ok || got == nil {
			t.Fatal("last_sync_attempt_at must be set even on failure, or the scheduler retries every tick")
		}
		if !got.Equal(now) {
			t.Errorf("last_sync_attempt_at = %v, want %v", got, now)
		}
	})

	t.Run("success advances both", func(t *testing.T) {
		u := syncStatusUpdates("success", "", now)

		watermark, ok := u["last_sync_at"].(*time.Time)
		if !ok || watermark == nil {
			t.Fatal("a successful sync must advance last_sync_at")
		}
		if !watermark.Equal(now) {
			t.Errorf("last_sync_at = %v, want %v", watermark, now)
		}

		attempt, ok := u["last_sync_attempt_at"].(*time.Time)
		if !ok || attempt == nil {
			t.Fatal("last_sync_attempt_at must be set on success too")
		}
		if !attempt.Equal(now) {
			t.Errorf("last_sync_attempt_at = %v, want %v", attempt, now)
		}
	})

	t.Run("in-progress status does not advance the watermark", func(t *testing.T) {
		if _, ok := syncStatusUpdates("syncing", "", now)["last_sync_at"]; ok {
			t.Error(`only "success" may advance last_sync_at`)
		}
	})
}
