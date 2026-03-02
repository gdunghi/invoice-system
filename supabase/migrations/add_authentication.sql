-- ============================================
-- Authentication & Authorization Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Companies Table (Multi-tenant support)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- 'admin', 'accountant', 'sales', 'viewer'
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'send_email', 'login'
  resource_type VARCHAR(50) NOT NULL, -- 'invoice', 'customer', 'user', 'settings'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- Update existing tables to support multi-tenant
-- ============================================

-- Add company_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- Add company_id to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- ============================================
-- Triggers
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile when auth.users is created (for OAuth)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    email_verified = EXCLUDED.email_verified,
    last_login_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- IMPORTANT: RLS is disabled for now to avoid circular references
-- Will be implemented with proper application-level checks instead

-- Uncomment below policies once app-level auth is working
-- For now, rely on authentication middleware to protect routes

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- NOTE: Simple RLS policies without circular references:
-- 1. Users table: No RLS needed, protect via app-level checks
-- 2. Invoices: Check company_id matches user's company
-- 3. Customers: Check company_id matches user's company
-- 4. Audit logs: Users can view own logs only

-- ============================================
-- Helper Functions
-- ============================================

-- Check if user has role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit entry
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Seed Data (Optional - for development)
-- ============================================

alter table companies add column  email VARCHAR(255)

-- Create default company
INSERT INTO companies (id, name, tax_id, address, phone, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Company',
  '0000000000000',
  '123 Default Street',
  '000-000-0000',
  'contact@company.com'
) ON CONFLICT (id) DO NOTHING;

-- Note: First user will be created via auth.users trigger
-- or manually after sign up

