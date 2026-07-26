package channels

import "regexp"

// sensitiveQueryParamPattern matches "key=value" query-parameter pairs whose
// value must never reach logs, the DB, or the UI in plaintext.
//
// net/http wraps transport-level failures (DNS errors, connection refused,
// timeouts, ...) in a *url.Error, whose Error() string embeds the full
// request URL verbatim — query string included. Adapters that authenticate
// via a query parameter (Pancake's page_access_token, Facebook's
// access_token) therefore leak the secret into any error message built from
// that error, unless it is scrubbed first. Header-based auth (Zalo OA) is
// unaffected because the token never appears in the URL.
var sensitiveQueryParamPattern = regexp.MustCompile(`(?i)(page_access_token|access_token)=[^&"'\s]*`)

// redactSecrets replaces sensitive query-parameter values in an error
// message with a placeholder so the message is safe to store or display.
// Call it on err.Error() (not the error itself) before wrapping — %w would
// re-embed the original, unredacted string.
func redactSecrets(msg string) string {
	return sensitiveQueryParamPattern.ReplaceAllString(msg, "${1}=REDACTED")
}
