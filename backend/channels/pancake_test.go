// backend/channels/pancake_test.go
package channels

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// newTestAdapter wires an adapter to a stub server.
func newTestAdapter(srvURL string) *PancakeAdapter {
	a := NewPancakeAdapter(PancakeCredentials{PageID: "p1", PageAccessToken: "tok123"})
	a.apiRoot = srvURL
	return a
}

func TestPancakeTreatsSuccessFalseAsError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Pancake answers HTTP 200 even when auth fails
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":false,"error_code":102,"message":"Invalid access_token"}`)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil {
		t.Fatal("expected an error when body has success=false, got nil")
	}
	if !strings.Contains(err.Error(), "Invalid access_token") {
		t.Errorf("error should carry the API message, got: %v", err)
	}
	if !strings.Contains(err.Error(), "102") {
		t.Errorf("error should carry error_code 102, got: %v", err)
	}
}

func TestPancakeHealthCheckPassesOnSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"success":true,"tags":[]}`)
	}))
	defer srv.Close()

	if err := newTestAdapter(srv.URL).HealthCheck(context.Background()); err != nil {
		t.Fatalf("HealthCheck should pass on success=true, got: %v", err)
	}
}

func TestPancakeSendsTokenAsQueryParamAndUsesV1Path(t *testing.T) {
	var gotToken, gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotToken = r.URL.Query().Get("page_access_token")
		gotPath = r.URL.Path
		fmt.Fprint(w, `{"success":true,"tags":[]}`)
	}))
	defer srv.Close()

	_ = newTestAdapter(srv.URL).HealthCheck(context.Background())

	if gotToken != "tok123" {
		t.Errorf("token must go in the query string, got %q", gotToken)
	}
	if gotPath != "/public_api/v1/pages/p1/tags" {
		t.Errorf("unexpected path: %q", gotPath)
	}
}

func TestPancakeReportsRateLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil || !strings.Contains(err.Error(), "429") {
		t.Errorf("expected a 429 rate-limit error, got: %v", err)
	}
}

func TestPancakeEscapesPageIDInPath(t *testing.T) {
	t.Run("hash_fragment_injection", func(t *testing.T) {
		// Verify that # in PageID is properly escaped to prevent fragment injection.
		// If # is not escaped, it will be interpreted as a URL fragment separator,
		// causing the page_access_token to be stripped from the query string.
		var gotPath string
		var gotToken string
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotPath = r.URL.Path
			gotToken = r.URL.Query().Get("page_access_token")
			fmt.Fprint(w, `{"success":true,"tags":[]}`)
		}))
		defer srv.Close()

		a := NewPancakeAdapter(PancakeCredentials{PageID: "p1#evil", PageAccessToken: "tok123"})
		a.apiRoot = srv.URL
		err := a.HealthCheck(context.Background())

		if err != nil {
			t.Fatalf("HealthCheck should not fail: %v", err)
		}

		// After unescaping the path, verify it contains the correct page_id
		decodedPath, err := url.PathUnescape(gotPath)
		if err != nil {
			t.Fatalf("failed to unescape path: %v", err)
		}
		expectedDecodedPath := "/public_api/v1/pages/p1#evil/tags"
		if decodedPath != expectedDecodedPath {
			t.Errorf("server received path %q, expected %q after decoding", decodedPath, expectedDecodedPath)
		}

		// Most importantly: verify that the token is NOT lost to fragment injection
		// Without proper escaping, # would cause page_access_token to be part of the fragment
		// and thus dropped from r.URL.Query()
		if gotToken != "tok123" {
			t.Errorf("token must not be stripped by fragment injection; got %q, expected %q", gotToken, "tok123")
		}
	})

	t.Run("control_character_safety", func(t *testing.T) {
		// Verify that control characters in PageID do not leak secrets in error messages.
		// If control characters are not escaped, http.NewRequestWithContext will fail
		// with an error message that contains the raw URL (including the token).
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, `{"success":true,"tags":[]}`)
		}))
		defer srv.Close()

		a := NewPancakeAdapter(PancakeCredentials{PageID: "p1\x00evil", PageAccessToken: "SECRETTOKEN"})
		a.apiRoot = srv.URL
		err := a.HealthCheck(context.Background())

		// The request should either succeed (if properly escaped) or fail gracefully,
		// but the error message must NOT contain the token in plaintext.
		if err != nil {
			// If there is an error, the message must not leak the token
			if strings.Contains(err.Error(), "SECRETTOKEN") {
				t.Errorf("error message must not leak token; got: %v", err)
			}
		}
	})
}

func TestPancakeErrorOnHTTPErrorWithoutSuccessField(t *testing.T) {
	// Verify that HTTP 500 with valid JSON but missing "success" field is treated as error.
	// This is a safety net for responses that have valid JSON but don't include the
	// "success" field, which would normally be relied upon to signal errors.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, `{"message":"boom"}`)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil {
		t.Fatal("expected an error when status is 500 and success field is missing, got nil")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error should mention HTTP 500, got: %v", err)
	}
}
