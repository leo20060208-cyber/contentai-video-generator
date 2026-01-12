-- Create credit_transactions table for tracking all credit additions and deductions
-- This provides a complete audit trail of user credit balance changes

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
    balance_after INTEGER NOT NULL, -- User's credit balance after this transaction
    type TEXT NOT NULL CHECK (type IN ('deduct', 'add')), -- Transaction type
    description TEXT NOT NULL, -- Human-readable description (e.g., "Generate image", "Monthly subscription")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
    ON credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Optional: Add comment for documentation
COMMENT ON TABLE credit_transactions IS 'Tracks all credit additions and deductions for users, providing a complete transaction history';
