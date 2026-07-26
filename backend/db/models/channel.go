package models

import "time"

type Channel struct {
	ID                   string     `gorm:"type:char(36);primaryKey" json:"id"`
	TenantID             string     `gorm:"type:char(36);not null;index:idx_channel_tenant_active" json:"tenant_id"`
	ChannelType          string     `gorm:"type:varchar(20);not null" json:"channel_type"` // zalo_oa | facebook | pancake
	Name                 string     `gorm:"type:varchar(255);not null" json:"name"`
	ExternalID           string     `gorm:"type:varchar(255)" json:"external_id"`
	CredentialsEncrypted []byte     `gorm:"type:varbinary(2048);not null" json:"-"`
	IsActive             bool       `gorm:"default:true;index:idx_channel_tenant_active" json:"is_active"`
	// LastSyncAt is the data watermark: the point up to which messages have been
	// successfully fetched. It only moves forward on a successful sync, so a
	// failed run never skips over the window it failed to read.
	LastSyncAt *time.Time `json:"last_sync_at"`
	// LastSyncAttemptAt records every attempt, successful or not. The scheduler
	// paces retries off this field; using LastSyncAt for that would busy-loop on
	// a failing channel.
	LastSyncAttemptAt *time.Time `json:"last_sync_attempt_at"`
	LastSyncStatus    string     `gorm:"type:varchar(20)" json:"last_sync_status"`
	LastSyncError        string     `gorm:"type:text" json:"last_sync_error,omitempty"`
	Metadata             string     `gorm:"type:json" json:"metadata"`
	CreatedAt            time.Time  `gorm:"not null" json:"created_at"`
	UpdatedAt            time.Time  `gorm:"not null" json:"updated_at"`

	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

func (Channel) TableName() string {
	return "channels"
}

// Unique constraint: tenant + type + external_id
// Added via migration hook
