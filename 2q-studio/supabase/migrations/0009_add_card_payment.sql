-- ==============================================================================
-- 0009_add_card_payment.sql: Add 'card' to payment_method enum
-- ==============================================================================
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
