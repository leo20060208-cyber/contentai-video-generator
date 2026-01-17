'use client';

import { useState } from 'react';
import { NewVideoCreateFlow } from '@/components/create-yours/NewVideoCreateFlow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { useRouter } from 'next/navigation';
import { PreUploadView } from '@/components/PreUploadView';

export default function CreateYoursPage() {
    const router = useRouter();
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    return (
        <ProtectedRoute>
            {!uploadedFile ? (
                <PreUploadView type="video" onUpload={setUploadedFile} />
            ) : (
                <div className="h-screen overflow-hidden pt-20 pb-10 px-4 flex flex-col">
                    <div className="flex-1 min-h-0 text-center">
                        <NewVideoCreateFlow
                            initialVideo={uploadedFile}
                            onCancel={() => setUploadedFile(null)}
                        />
                    </div>
                </div>
            )}

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
