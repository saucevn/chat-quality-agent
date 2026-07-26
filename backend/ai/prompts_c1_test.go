package ai

import (
	"strings"
	"testing"
)

// TestFormatChatTranscriptDistinguishesSenderRoles is a regression test for
// C1: bot/automation messages (sender_type="system") must be visually
// distinguishable from real agent messages in the transcript handed to the
// AI, even when both share the same display name. Pancake attributes
// automated replies to a staff account (see classifyPancakeSender in
// channels/pancake.go), so SenderName alone is not enough to tell them
// apart — before this fix an automated message rendered identically to a
// hand-typed agent message.
func TestFormatChatTranscriptDistinguishesSenderRoles(t *testing.T) {
	messages := []ChatMessage{
		{SenderType: "customer", SenderName: "Nguyen Van A", Content: "Cho hỏi giá sản phẩm", SentAt: "09:00"},
		{SenderType: "agent", SenderName: "Lan", Content: "Dạ giá 200k ạ", SentAt: "09:01"},
		{SenderType: "system", SenderName: "Lan", Content: "Đơn hàng của bạn đã được xác nhận", SentAt: "09:02"},
	}

	transcript := FormatChatTranscript(messages)
	lines := strings.Split(strings.TrimSpace(transcript), "\n")
	if len(lines) != 3 {
		t.Fatalf("expected 3 transcript lines, got %d: %q", len(lines), transcript)
	}
	customerLine, agentLine, systemLine := lines[0], lines[1], lines[2]

	// Agent and system share SenderName "Lan" — the fix must still make the
	// two lines distinguishable via a role annotation.
	if agentLine == systemLine {
		t.Fatalf("agent and system lines must differ despite identical SenderName, got identical: %q", agentLine)
	}
	if customerLine == agentLine || customerLine == systemLine {
		t.Fatalf("customer line must differ from agent/system lines")
	}

	if !strings.Contains(agentLine, "nhân viên") || strings.Contains(agentLine, "tự động") {
		t.Errorf("agent line should be labeled as staff and not as automated: %q", agentLine)
	}

	// The system message must be explicitly marked as automated AND as
	// excluded from agent scoring, per the project-wide rule.
	if !strings.Contains(systemLine, "tự động") {
		t.Errorf("system line must mark the message as automated: %q", systemLine)
	}
	if !strings.Contains(strings.ToLower(systemLine), "không tính") {
		t.Errorf("system line must state it does not count toward agent scoring: %q", systemLine)
	}
}

// TestBuildQCPromptExplainsSystemRoleExclusion proves the QC prompt itself
// (not just the transcript formatting) tells the AI that "system"-tagged
// transcript lines are automated and must not be scored as agent behavior.
func TestBuildQCPromptExplainsSystemRoleExclusion(t *testing.T) {
	prompt := BuildQCPrompt("## Phải chào hỏi lịch sự", "")

	if !strings.Contains(prompt, "tự động") {
		t.Error("QC prompt should explain that automated/system messages exist")
	}
	lower := strings.ToLower(prompt)
	if !strings.Contains(lower, "không tính") && !strings.Contains(lower, "không đánh giá") && !strings.Contains(lower, "không dùng") {
		t.Error("QC prompt should instruct the AI not to score automated messages as agent behavior")
	}
}
