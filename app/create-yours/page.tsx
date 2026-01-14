'use client';

import { NewVideoCreateFlow } from '@/components/create-yours/NewVideoCreateFlow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { useRouter } from 'next/navigation';

export default function CreateYoursPage() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <div className="h-screen overflow-hidden pt-20 pb-10 px-4 flex flex-col">
                <div className="flex-1 min-h-0 text-center">
                    <NewVideoCreateFlow onCancel={() => router.back()} />
                </div>
            </div>

            {/* Onboarding Popup */}
            <OnboardingPopup
                pageKey="video-editing"
                stepsKey="createVideoSteps"
                titleKey="createVideoTitle"
                defaultTitle="VIDEO EDITING"
                plusInfoUrl="/guide/video-editing"
            />
        </ProtectedRoute>
    );
}
