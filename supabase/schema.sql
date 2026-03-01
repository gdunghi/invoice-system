-- ===================================
-- Invoice System - Supabase Schema
-- ===================================

-- Companies (ข้อมูลบริษัท)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  tax_id TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (ลูกค้า)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  tax_id TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (ใบแจ้งหนี้)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  seller_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_tax_id TEXT,
  company_phone TEXT,
  company_website TEXT,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_tax_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  vat_rate NUMERIC(5, 2) DEFAULT 7,
  vat_amount NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Items (รายการสินค้า/บริการ)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_order INT DEFAULT 1,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'วัน',
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment invoice number function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := TO_CHAR(NOW(), 'YYYY');
  seq_num INT;
  invoice_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  invoice_num := 'BL' || year_str || LPAD(seq_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies (enable for production)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- For development: allow all (change in production)
CREATE POLICY "Allow all" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON companies FOR ALL USING (true) WITH CHECK (true);

-- Sample data
INSERT INTO customers (name, address, tax_id, contact_name, phone, email) VALUES
(
  'บริษัท ออด-อี (ประเทศไทย) จำกัด',
  '2549/41-43 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900',
  '0105556110718',
  'Twin Panichsombat',
  '+66809737799',
  'th@odd-e.com'
);




ALTER TABLE invoices ADD COLUMN withholding_tax_rate NUMERIC(5,2) DEFAULT 3;
ALTER TABLE invoices ADD COLUMN withholding_tax_amount NUMERIC(12,2) DEFAULT 0;
