-- Migration: Add note column to products

ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT;
