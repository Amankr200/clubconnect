CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_group_id UUID NOT NULL,
  society_id INTEGER NOT NULL REFERENCES societies(id) ON DELETE RESTRICT,
  event_id UUID NULL REFERENCES venue_bookings(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  config JSONB NOT NULL,
  background_data BYTEA NOT NULL,
  background_mime VARCHAR(32) NOT NULL CHECK (background_mime IN ('image/png', 'image/jpeg')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_group_id, version)
);

CREATE INDEX IF NOT EXISTS certificate_templates_society_idx
  ON certificate_templates (society_id, created_at DESC);
CREATE INDEX IF NOT EXISTS certificate_templates_event_idx
  ON certificate_templates (event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS certificate_templates_one_active_context_idx
  ON certificate_templates (
    society_id,
    COALESCE(event_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id VARCHAR(80) NOT NULL UNIQUE,
  verification_token VARCHAR(96) NOT NULL UNIQUE,
  event_id UUID NOT NULL REFERENCES venue_bookings(id) ON DELETE RESTRICT,
  student_id BIGINT NOT NULL REFERENCES students(enrollment_id) ON DELETE RESTRICT,
  society_id INTEGER NOT NULL REFERENCES societies(id) ON DELETE RESTRICT,
  template_version_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
  template_snapshot JSONB NOT NULL,
  field_values JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'GENERATING', 'FAILED', 'GENERATED', 'REVOKED')),
  pdf_data BYTEA NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generation_started_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reissued_from UUID NULL REFERENCES certificates(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_one_current_per_student_event_idx
  ON certificates (event_id, student_id) WHERE status <> 'REVOKED';
CREATE INDEX IF NOT EXISTS certificates_student_idx
  ON certificates (student_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS certificates_retry_idx
  ON certificates (next_attempt_at, created_at)
  WHERE status IN ('PENDING', 'FAILED', 'GENERATING');

CREATE TABLE IF NOT EXISTS certificate_audit (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(24) NOT NULL CHECK (action IN ('REISSUE')),
  previous_certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE RESTRICT,
  new_certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS certificate_audit_previous_idx
  ON certificate_audit (previous_certificate_id, created_at DESC);
