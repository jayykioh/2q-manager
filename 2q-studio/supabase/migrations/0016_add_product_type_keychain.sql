-- ==============================================================================
-- 0016_add_product_type_keychain.sql: Add keychain to product_type enum
-- ==============================================================================

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'keychain';
