-- FuJue Platform schema (MySQL 8 / MariaDB 10.6+).
-- Applied by `npm run db:init`; safe to re-run.

CREATE TABLE IF NOT EXISTS platform_meta (
  meta_key VARCHAR(64) NOT NULL PRIMARY KEY,
  meta_value TEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  locale VARCHAR(16) NOT NULL DEFAULT 'vi',
  timezone_offset_seconds INT NOT NULL DEFAULT 0,
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  balance_usd DECIMAL(18, 6) NOT NULL DEFAULT 0.000000,
  bonus_usd DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  user_agent VARCHAR(512) NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sessions_user (user_id),
  KEY sessions_expiry (expires_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tokens the desktop app sends as x-dsh-auth-token. Only the SHA-256 digest is stored.
CREATE TABLE IF NOT EXISTS account_tokens (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(120) NULL,
  device_id CHAR(36) NULL,
  device_model VARCHAR(120) NULL,
  os_version VARCHAR(120) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  KEY account_tokens_user (user_id),
  CONSTRAINT account_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  prefix VARCHAR(32) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  UNIQUE KEY api_keys_hash_unique (key_hash),
  KEY api_keys_user (user_id),
  CONSTRAINT api_keys_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One pending desktop sign-in: PKCE challenge, allowed redirect, then the issued code.
CREATE TABLE IF NOT EXISTS auth_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code_challenge VARCHAR(128) NOT NULL,
  code_challenge_method VARCHAR(8) NOT NULL DEFAULT 'S256',
  state VARCHAR(256) NOT NULL,
  redirect_uri VARCHAR(1024) NOT NULL,
  locale VARCHAR(16) NULL,
  login_source VARCHAR(32) NULL,
  user_id CHAR(36) NULL,
  code_hash CHAR(64) NULL,
  status ENUM('pending', 'approved', 'exchanged', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  approved_at DATETIME(3) NULL,
  exchanged_at DATETIME(3) NULL,
  KEY auth_requests_status (status),
  KEY auth_requests_expiry (expires_at),
  CONSTRAINT auth_requests_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  api_key_id CHAR(36) NULL,
  model VARCHAR(120) NOT NULL,
  prompt_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  completion_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  cost_usd DECIMAL(18, 8) NOT NULL DEFAULT 0,
  source ENUM('playground', 'api', 'desktop') NOT NULL DEFAULT 'api',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY usage_events_user_created (user_id, created_at),
  KEY usage_events_key (api_key_id),
  CONSTRAINT usage_events_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT usage_events_key_fk FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title_vi VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  body_vi TEXT NOT NULL,
  body_en TEXT NOT NULL,
  action_label_vi VARCHAR(80) NOT NULL,
  action_label_en VARCHAR(80) NOT NULL,
  action_style ENUM('primary', 'secondary') NOT NULL DEFAULT 'primary',
  audience ENUM('all', 'user') NOT NULL DEFAULT 'all',
  user_id CHAR(36) NULL,
  data_json JSON NULL,
  published_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  display_until DATETIME(3) NULL,
  KEY notifications_audience (audience, user_id),
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_receipts (
  notification_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  displayed_at DATETIME(3) NULL,
  consumed_at DATETIME(3) NULL,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT notification_receipts_notification_fk FOREIGN KEY (notification_id) REFERENCES notifications (id) ON DELETE CASCADE,
  CONSTRAINT notification_receipts_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Third-party model services. Administrators add these in the admin console; the
-- credential is write-only over the API and never returned to a client.
CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  chat_base_url VARCHAR(512) NULL,
  anthropic_base_url VARCHAR(512) NULL,
  api_key VARCHAR(1024) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  note VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Served models. Rows are seeded from the code catalog on first read and then
-- owned by the admin console; the desktop `/models` listing and metering read here.
CREATE TABLE IF NOT EXISTS models (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  tagline VARCHAR(240) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  context_window INT UNSIGNED NOT NULL DEFAULT 131072,
  max_output_tokens INT UNSIGNED NOT NULL DEFAULT 8192,
  input_modalities VARCHAR(64) NOT NULL DEFAULT 'text',
  input_price_usd DECIMAL(12, 6) NOT NULL DEFAULT 0.000000,
  output_price_usd DECIMAL(12, 6) NOT NULL DEFAULT 0.000000,
  capabilities_json JSON NOT NULL,
  badge_text_vi VARCHAR(40) NULL,
  badge_text_en VARCHAR(40) NULL,
  badge_tone ENUM('neutral', 'info', 'success', 'warning') NULL,
  recommended TINYINT(1) NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  provider_id VARCHAR(64) NULL,
  upstream_id VARCHAR(120) NULL,
  reasoning_enabled TINYINT(1) NOT NULL DEFAULT 0,
  reasoning_levels TEXT NOT NULL,
  reasoning_default VARCHAR(40) NOT NULL DEFAULT 'off',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY models_provider (provider_id),
  CONSTRAINT models_provider_fk FOREIGN KEY (provider_id) REFERENCES providers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only record of administrator mutations.
CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  actor_email VARCHAR(255) NOT NULL,
  action VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  detail VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY admin_audit_created (created_at),
  CONSTRAINT admin_audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_meta (meta_key, meta_value) VALUES ('schema_version', '3')
  ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value);
