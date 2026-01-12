'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Transaction {
    id: string;
    amount: number;
    balance_after: number;
    type: 'add' | 'deduct';
    description: string;
    created_at: string;
}

export function TransactionHistory({ userId }: { userId: string }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();

        // Realtime Subscription
        const channel = supabase
            .channel('credit_transactions_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'credit_transactions',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newTx = payload.new as Transaction;
                    setTransactions(prev => [newTx, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const loadTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500 text-sm">No transactions yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>

            <div className="space-y-2">
                {transactions.map((transaction, index) => (
                    <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-4">
                            {/* Left: Icon + Details */}
                            <div className="flex items-start gap-3 flex-1">
                                <div className={`mt-0.5 ${transaction.type === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                                    {transaction.type === 'add' ? (
                                        <ArrowUpCircle className="w-5 h-5" />
                                    ) : (
                                        <ArrowDownCircle className="w-5 h-5" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">
                                        {transaction.description}
                                    </p>
                                    <p className="text-zinc-500 text-xs mt-0.5">
                                        {formatDate(transaction.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Amount + Balance */}
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${transaction.type === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                                    {transaction.type === 'add' ? '+' : ''}{transaction.amount.toLocaleString()} credits
                                </p>
                                <p className="text-zinc-500 text-xs mt-0.5">
                                    Balance: {transaction.balance_after.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
