'use client';

import { ImageCreateFlow } from '@/components/create-yours/ImageCreateFlow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { useRouter } from 'next/navigation';

export default function CreateImagePage() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <div className="h-screen overflow-hidden pt-20 pb-10 px-4 flex flex-col">
                <div className="flex-1 min-h-0">
                    <ImageCreateFlow onCancel={() => router.back()} />
                </div>
            </div>

            {/* Onboarding Popup */}
            <OnboardingPopup
                pageKey="image-editing"
                stepsKey="createImageSteps"
                titleKey="createImageTitle"
                defaultTitle="IMAGE EDITING"
                plusInfoUrl="/guide/image-editing"
            />
        </ProtectedRoute>
    );
}
