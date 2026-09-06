-- ════════════════════════════════════════════════════════
-- LOAN MODULE: Schema update — separate from chit members
-- Run this in your Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- Step 1: Add customer_name column to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Step 2: Add customer_name column to loan_installments table  
ALTER TABLE loan_installments ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Step 3: Make customer_id nullable (no longer required)
ALTER TABLE loans ALTER COLUMN customer_id DROP NOT NULL;

-- Step 4: Make customer_id nullable in installments too
ALTER TABLE loan_installments ALTER COLUMN customer_id DROP NOT NULL;

-- Done! The loan module now stores customer_name as free text,
-- completely independent of the chit members system.
