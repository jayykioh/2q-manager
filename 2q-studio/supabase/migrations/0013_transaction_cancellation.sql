ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE transactions ADD COLUMN cancel_reason TEXT;
