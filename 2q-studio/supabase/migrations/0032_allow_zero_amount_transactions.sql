-- 0032_allow_zero_amount_transactions.sql
-- Allow zero-amount transactions to support checking out and refunding zero-dollar orders (e.g., free items, 100% discount).

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_check CHECK (amount >= 0);
