'use client';
import { cn } from '@/lib/utils/cn';

export default function TestCnPage() {
    const className = cn('bg-red-500', 'text-white');
    return (
        <div className={`pt-24 ${className}`}>
            CN TEST
        </div>
    );
}
