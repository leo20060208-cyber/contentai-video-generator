'use client';

import { CreateYoursFlow } from '@/components/create-yours/CreateYoursFlow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function CreateYoursPage() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-zinc-950 pt-24 pb-12 px-4">
                <CreateYoursFlow onCancel={() => router.back()} />
            </div>
        </ProtectedRoute>
    );
}
