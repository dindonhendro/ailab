-- ================================================================
--  IACCLM AI Lab — Tahap 3: Clinical Standardization
--  Platform: Supabase Cloud (PostgreSQL)
-- ================================================================

-- 1. Create medical_audit_logs table
CREATE TABLE IF NOT EXISTS medical_audit_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  session_id    UUID NOT NULL,
  action_type   TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'VALIDATE', 'SUBMIT_SATUSEHAT'
  old_values    JSONB,
  new_values    JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Audit trigger function
CREATE OR REPLACE FUNCTION log_medical_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_val JSONB := NULL;
  new_val JSONB := NULL;
  sess_id UUID;
  user_uuid UUID;
BEGIN
  -- Get user ID from current supabase claim
  user_uuid := auth.uid();
  
  IF TG_OP = 'UPDATE' THEN
    old_val := to_jsonb(OLD);
    new_val := to_jsonb(NEW);
    
    -- Extract session id
    IF TG_TABLE_NAME = 'lab_results' THEN
      sess_id := NEW.session_id;
    ELSIF TG_TABLE_NAME = 'diagnostic_reports' THEN
      sess_id := NEW.session_id;
    ELSE
      sess_id := NEW.id;
    END IF;

    INSERT INTO medical_audit_logs (user_id, session_id, action_type, old_values, new_values)
    VALUES (user_uuid, sess_id, 'UPDATE', old_val, new_val);
  ELSIF TG_OP = 'INSERT' THEN
    new_val := to_jsonb(NEW);
    
    IF TG_TABLE_NAME = 'lab_results' THEN
      sess_id := NEW.session_id;
    ELSIF TG_TABLE_NAME = 'diagnostic_reports' THEN
      sess_id := NEW.session_id;
    ELSE
      sess_id := NEW.id;
    END IF;

    INSERT INTO medical_audit_logs (user_id, session_id, action_type, new_values)
    VALUES (user_uuid, sess_id, 'CREATE', new_val);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach audit triggers
DROP TRIGGER IF EXISTS trg_audit_lab_results ON lab_results;
CREATE TRIGGER trg_audit_lab_results
  AFTER INSERT OR UPDATE ON lab_results
  FOR EACH ROW EXECUTE FUNCTION log_medical_changes();

DROP TRIGGER IF EXISTS trg_audit_diagnostic_reports ON diagnostic_reports;
CREATE TRIGGER trg_audit_diagnostic_reports
  AFTER INSERT OR UPDATE ON diagnostic_reports
  FOR EACH ROW EXECUTE FUNCTION log_medical_changes();

-- 4. Enable RLS and verification restrictions for doctor role on diagnostic_reports
-- Let's ensure only users with profile role 'dokter' can change status to 'submitted' or 'verified'.
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'dokter'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policy for diagnostic_reports to restrict insert/update of final verification
DROP POLICY IF EXISTS "Users can access diagnostic reports in their sessions" ON diagnostic_reports;

CREATE POLICY "Users can view diagnostic reports in their sessions"
  ON diagnostic_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lab_sessions s
      WHERE s.id = diagnostic_reports.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Analis and Dokter can insert draft reports"
  ON diagnostic_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_sessions s
      WHERE s.id = session_id
        AND s.user_id = auth.uid()
    ) AND status = 'draft'
  );

CREATE POLICY "Only Dokter can verify or submit reports"
  ON diagnostic_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lab_sessions s
      WHERE s.id = diagnostic_reports.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- If the new status is 'draft', anyone with access can update. 
    -- If it's changing to verified or submitted, they must be a doctor.
    (status = 'draft') OR is_doctor()
  );
