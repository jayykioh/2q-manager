-- 0023_add_product_type_spoon_fork.sql: Add spoon and fork to product_type enum

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'spoon';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'fork';
