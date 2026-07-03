-- ==============================================================================
-- 0019_add_product_type_necklace.sql: Add necklace to product_type enum
-- ==============================================================================

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'necklace';
