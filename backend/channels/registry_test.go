package channels

import (
	"testing"
)

func TestNewAdapterZaloOA(t *testing.T) {
	creds := `{"app_id":"123","app_secret":"abc","access_token":"tok","refresh_token":"ref"}`
	adapter, err := NewAdapter("zalo_oa", []byte(creds))
	if err != nil {
		t.Fatalf("NewAdapter zalo_oa failed: %v", err)
	}
	if adapter == nil {
		t.Fatal("Adapter should not be nil")
	}
}

func TestNewAdapterFacebook(t *testing.T) {
	creds := `{"page_id":"123","access_token":"tok"}`
	adapter, err := NewAdapter("facebook", []byte(creds))
	if err != nil {
		t.Fatalf("NewAdapter facebook failed: %v", err)
	}
	if adapter == nil {
		t.Fatal("Adapter should not be nil")
	}
}

func TestNewAdapterUnsupported(t *testing.T) {
	_, err := NewAdapter("whatsapp", []byte("{}"))
	if err == nil {
		t.Fatal("Should fail for unsupported channel type")
	}
}

func TestNewAdapterInvalidJSON(t *testing.T) {
	_, err := NewAdapter("zalo_oa", []byte("not json"))
	if err == nil {
		t.Fatal("Should fail for invalid JSON")
	}
}

func TestNewAdapterSupportsPancake(t *testing.T) {
	creds := []byte(`{"page_id":"p1","page_access_token":"tok123"}`)

	adapter, err := NewAdapter("pancake", creds)
	if err != nil {
		t.Fatalf("pancake should be a supported channel type, got: %v", err)
	}
	pa, ok := adapter.(*PancakeAdapter)
	if !ok {
		t.Fatalf("expected *PancakeAdapter, got %T", adapter)
	}
	if pa.creds.PageID != "p1" || pa.creds.PageAccessToken != "tok123" {
		t.Errorf("credentials not unmarshalled: %+v", pa.creds)
	}
}

func TestNewAdapterRejectsBadPancakeCredentials(t *testing.T) {
	if _, err := NewAdapter("pancake", []byte(`not json`)); err == nil {
		t.Error("expected an error for malformed pancake credentials")
	}
}
