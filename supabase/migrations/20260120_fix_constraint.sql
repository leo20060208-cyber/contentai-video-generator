-- Fix restrictive constraint on credit_transactions type
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

-- Add a more permissive constraint
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type IN ('deduct', 'add', 'usage', 'purchase', 'refund', 'bonus', 'credit', 'debit', 'subtraction', 'cost', 'fee', 'charge'));
