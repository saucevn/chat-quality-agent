package channels

import (
	"context"
	"strings"
	"testing"
)

func TestRedactSecretsStripsTokenValues(t *testing.T) {
	cases := []struct {
		name  string
		input string
	}{
		{
			name:  "pancake page_access_token mid-query",
			input: `pancake: request failed: Get "https://pages.fm/api/public_api/v1/pages/p1/tags?page_access_token=SECRET_TOKEN_ABC123": dial tcp: no such host`,
		},
		{
			name:  "facebook access_token mid-query",
			input: `facebook api request failed: Get "https://graph.facebook.com/v21.0/123/messages?fields=id&access_token=EAABSECRETXYZ": dial tcp: no such host`,
		},
		{
			name:  "token as the last query param (no trailing &)",
			input: `Get "https://pages.fm/api/x?page_access_token=TRAILING_SECRET": dial tcp: lookup pages.fm: no such host`,
		},
		{
			name:  "uppercase param name",
			input: `Get "https://x/y?ACCESS_TOKEN=UPPERSECRET": dial tcp: no such host`,
		},
	}

	secrets := []string{"SECRET_TOKEN_ABC123", "EAABSECRETXYZ", "TRAILING_SECRET", "UPPERSECRET"}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := redactSecrets(tc.input)
			for _, s := range secrets {
				if strings.Contains(got, s) {
					t.Errorf("redacted message still contains secret %q: %q", s, got)
				}
			}
			if !strings.Contains(got, "REDACTED") {
				t.Errorf("expected redacted message to contain REDACTED marker, got: %q", got)
			}
		})
	}

	// A message with no sensitive param must pass through unchanged.
	plain := "pancake: rate limited (HTTP 429) on page p1"
	if redactSecrets(plain) != plain {
		t.Errorf("message without secrets should be unchanged, got: %q", redactSecrets(plain))
	}
}

// TestPancakeRequestFailureDoesNotLeakToken is the C2 regression test: point
// the adapter at a host that cannot resolve, trigger the client.Do failure
// path in doRequest, and assert the resulting error — the one that flows
// into channels.last_sync_error / activity_logs / the sync-history API —
// never contains the raw page_access_token.
func TestPancakeRequestFailureDoesNotLeakToken(t *testing.T) {
	const secretToken = "SECRET_TOKEN_ABC123"
	a := NewPancakeAdapter(PancakeCredentials{PageID: "p1", PageAccessToken: secretToken})
	a.apiRoot = "http://pancake-test-host-does-not-exist.invalid"
	a.pacer = newPacer(0)

	err := a.HealthCheck(context.Background())
	if err == nil {
		t.Fatal("expected an error from an unresolvable host, got nil")
	}
	if strings.Contains(err.Error(), secretToken) {
		t.Errorf("pancake error message must not leak page_access_token in plaintext; got: %v", err)
	}
}

// TestFacebookRequestFailureDoesNotLeakToken mirrors the Pancake case for
// facebook.go, which has the identical bug: client.Do's *url.Error embeds
// the full request URL, access_token included.
func TestFacebookRequestFailureDoesNotLeakToken(t *testing.T) {
	const secretToken = "SECRET_TOKEN_XYZ789"
	f := NewFacebookAdapter(FacebookCredentials{PageID: "p1", AccessToken: secretToken})

	badURL := "http://facebook-test-host-does-not-exist.invalid/123/messages?fields=id&access_token=" + secretToken
	_, err := f.doRequest(context.Background(), badURL)
	if err == nil {
		t.Fatal("expected an error from an unresolvable host, got nil")
	}
	if strings.Contains(err.Error(), secretToken) {
		t.Errorf("facebook error message must not leak access_token in plaintext; got: %v", err)
	}
}

// Zalo OA needs no equivalent test: it authenticates via the "access_token"
// HTTP header (see zalo_oa.go doRequest), never the URL, so client.Do's
// *url.Error cannot contain it.
