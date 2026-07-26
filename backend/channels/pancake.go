package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const (
	pancakeAPIRoot = "https://pages.fm/api"

	// Pancake allows 5 calls per page per second. One call each 200ms stays
	// under the limit without needing burst accounting.
	pancakeMinInterval = 200 * time.Millisecond
)

// PancakeCredentials is the decrypted JSON stored in channels.credentials_encrypted.
//
// Unlike Zalo OA, page_access_token never expires, so there is no refresh flow
// and no OnTokenRefresh callback.
type PancakeCredentials struct {
	PageID          string `json:"page_id"`
	PageAccessToken string `json:"page_access_token"`
}

type PancakeAdapter struct {
	creds   PancakeCredentials
	client  *http.Client
	apiRoot string // overridden in tests
	pacer   *pacer
}

func NewPancakeAdapter(creds PancakeCredentials) *PancakeAdapter {
	return &PancakeAdapter{
		creds:   creds,
		client:  &http.Client{Timeout: 30 * time.Second},
		apiRoot: pancakeAPIRoot,
		pacer:   newPacer(pancakeMinInterval),
	}
}

func (p *PancakeAdapter) v1(suffix string) string {
	return "/public_api/v1/pages/" + url.PathEscape(p.creds.PageID) + suffix
}

func (p *PancakeAdapter) v2(suffix string) string {
	return "/public_api/v2/pages/" + url.PathEscape(p.creds.PageID) + suffix
}

// doRequest performs a GET and decodes the JSON body.
//
// Pancake returns HTTP 200 even for authentication failures and signals the
// problem through the "success" field, so the status code alone must never be
// trusted. Verified against the live API:
//
//	GET /api/v1/pages?access_token=invalid
//	-> HTTP 200 {"success":false,"error_code":102,"message":"Invalid access_token"}
func (p *PancakeAdapter) doRequest(ctx context.Context, path string, params url.Values) (map[string]interface{}, error) {
	if err := p.pacer.wait(ctx); err != nil {
		return nil, err
	}

	if params == nil {
		params = url.Values{}
	}
	// Clone params to avoid mutating the caller's map.
	paramsCopy := make(url.Values)
	for k, v := range params {
		paramsCopy[k] = v
	}
	paramsCopy.Set("page_access_token", p.creds.PageAccessToken)

	endpoint := p.apiRoot + path + "?" + paramsCopy.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("pancake: build request: %w", err)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pancake: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("pancake: rate limited (HTTP 429) on page %s", p.creds.PageID)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("pancake: decode response (HTTP %d): %w", resp.StatusCode, err)
	}

	if ok, present := body["success"].(bool); present && !ok {
		msg, _ := body["message"].(string)
		code, _ := body["error_code"].(float64)
		return nil, fmt.Errorf("pancake: api error %d: %s (request_id=%s)",
			int(code), msg, resp.Header.Get("x-request-id"))
	}

	// Safety net for valid JSON responses with error status codes but missing the
	// "success" field. This is not a substitute for checking "success" — it's a
	// fallback for edge cases where Pancake returns an error status without the
	// expected "success" field marker.
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("pancake: unexpected HTTP %d", resp.StatusCode)
	}

	return body, nil
}

// HealthCheck verifies credentials with the cheapest page-scoped call.
// VERIFY-7: /tags is assumed to be the lightest endpoint; confirm with a real token.
func (p *PancakeAdapter) HealthCheck(ctx context.Context) error {
	_, err := p.doRequest(ctx, p.v1("/tags"), nil)
	return err
}
