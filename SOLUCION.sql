-- ==========================================
-- SOLUCION AL ERROR DE CREDITOS
-- Copia y Pega esto en el SQL Editor de Supabase
-- ==========================================

-- 1. Eliminar la restricción actual que está fallando
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

-- 2. Añadir una nueva restricción correcta que permita 'deduct'
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type IN ('deduct', 'add', 'usage', 'purchase', 'spent', 'bought', 'refill', 'credit', 'debit', 'subtraction', 'cost', 'fee', 'charge', 'generation'));

-- 3. Confirmación
SELECT 'Corrección aplicada con éxito' as status;
