'use client';

import { useState } from 'react';
import { CreateYoursModal } from '@/components/CreateYoursModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function CreateYoursPage() {
    const [isModalOpen, setIsModalOpen] = useState(true);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-zinc-950 pt-20">
                <CreateYoursModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        // Redirect to library when closed
                        window.location.href = '/library';
                    }}
                />
            </div>
        </ProtectedRoute>
    );
}
