package channels

import "testing"

// SenderExternalID carries the platform identity of whoever sent the message:
// the staff UUID for agent messages, the customer PSID for customer messages.
// Without it, per-agent quality scoring is impossible.
func TestSyncedMessageCarriesSenderExternalID(t *testing.T) {
	m := SyncedMessage{SenderExternalID: "uuid-1"}
	if m.SenderExternalID != "uuid-1" {
		t.Errorf("SenderExternalID = %q, want %q", m.SenderExternalID, "uuid-1")
	}
}
