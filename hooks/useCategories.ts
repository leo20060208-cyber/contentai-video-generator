import { useState, useEffect } from 'react';

export interface Category {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/categories');
            if (!res.ok) {
                // Fallback to default categories if table doesn't exist yet
                console.warn('Categories table not found, using defaults');
                setCategories([
                    { id: '1', name: 'VISUAL', slug: 'visual', order_index: 1, is_active: true, created_at: '', updated_at: '' },
                    { id: '2', name: 'CLOTHING BRANDS', slug: 'clothing-brands', order_index: 2, is_active: true, created_at: '', updated_at: '' },
                    { id: '3', name: 'ASMR', slug: 'asmr', order_index: 3, is_active: true, created_at: '', updated_at: '' },
                    { id: '4', name: 'VISUAL TEMPLATES', slug: 'visual-templates', order_index: 4, is_active: true, created_at: '', updated_at: '' },
                    { id: '5', name: 'DROP SHIPPING', slug: 'drop-shipping', order_index: 5, is_active: true, created_at: '', updated_at: '' },
                    { id: '6', name: 'ECOMMERCE', slug: 'ecommerce', order_index: 6, is_active: true, created_at: '', updated_at: '' },
                    { id: '7', name: 'BRAND', slug: 'brand', order_index: 7, is_active: true, created_at: '', updated_at: '' },
                ]);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setCategories(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching categories:', err);
            // Use fallback categories on error
            setCategories([
                { id: '1', name: 'VISUAL', slug: 'visual', order_index: 1, is_active: true, created_at: '', updated_at: '' },
                { id: '2', name: 'CLOTHING BRANDS', slug: 'clothing-brands', order_index: 2, is_active: true, created_at: '', updated_at: '' },
                { id: '3', name: 'ASMR', slug: 'asmr', order_index: 3, is_active: true, created_at: '', updated_at: '' },
                { id: '4', name: 'VISUAL TEMPLATES', slug: 'visual-templates', order_index: 4, is_active: true, created_at: '', updated_at: '' },
                { id: '5', name: 'DROP SHIPPING', slug: 'drop-shipping', order_index: 5, is_active: true, created_at: '', updated_at: '' },
                { id: '6', name: 'ECOMMERCE', slug: 'ecommerce', order_index: 6, is_active: true, created_at: '', updated_at: '' },
                { id: '7', name: 'BRAND', slug: 'brand', order_index: 7, is_active: true, created_at: '', updated_at: '' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const addCategory = async (name: string, description?: string, icon?: string) => {
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, icon })
            });
            if (!res.ok) throw new Error('Failed to create category');
            await fetchCategories();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete category');
            await fetchCategories();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    return {
        categories,
        loading,
        error,
        addCategory,
        deleteCategory,
        refresh: fetchCategories
    };
}
