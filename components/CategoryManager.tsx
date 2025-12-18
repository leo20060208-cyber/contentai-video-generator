'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CategoryManager = ({ isOpen, onClose }: CategoryManagerProps) => {
    const { categories, loading, addCategory, deleteCategory } = useCategories();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;

        setIsAdding(true);
        const success = await addCategory(newCategoryName.trim());
        if (success) {
            setNewCategoryName('');
        }
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;

        setDeletingId(id);
        await deleteCategory(id);
        setDeletingId(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 max-h-[80vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Manage Categories</h2>
                                    <p className="text-sm text-zinc-400 mt-1">Add or remove video categories</p>
                                </div>
                                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Add New Category */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-white mb-2">
                                    Add New Category
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                        placeholder="e.g., TECH REVIEWS"
                                        className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                                    />
                                    <Button
                                        onClick={handleAdd}
                                        disabled={!newCategoryName.trim() || isAdding}
                                        className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Categories List */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-3">
                                    Existing Categories ({categories.length})
                                </label>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500">
                                        No categories yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {categories.map((category) => (
                                            <div
                                                key={category.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div>
                                                    <div className="font-medium text-white">{category.name}</div>
                                                    <div className="text-xs text-zinc-500">Slug: {category.slug}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
                                                    disabled={deletingId === category.id}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === category.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10">
                            <Button
                                onClick={onClose}
                                variant="secondary"
                                className="w-full"
                            >
                                Close
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
