-- FIX: Credit Transactions & Atomic Deduction
-- Run this in your Supabase SQL Editor

-- 1. Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL, -- negative for deduction, positive for addition
    type TEXT NOT NULL,      -- 'deduct', 'add'
    description TEXT,
    balance_after INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- 3. Atomic Deduction Function (RPC)
-- This ensures credits are subtracted AND logged in a single transaction
CREATE OR REPLACE FUNCTION deduct_credits_v2(p_user_id UUID, p_amount INTEGER, p_description TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    curr_credits INTEGER;
BEGIN
    -- 1. Get and Lock the profile row
    SELECT credits INTO curr_credits FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    IF curr_credits IS NULL OR curr_credits < p_amount THEN
        RETURN FALSE;
    END IF;

    -- 2. Deduct
    UPDATE public.profiles SET credits = credits - p_amount WHERE id = p_user_id;

    -- 3. Log Transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (p_user_id, -p_amount, 'deduct', p_description, curr_credits - p_amount);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
