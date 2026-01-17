'use client';

import { useState } from 'react';
import { ImageCreateFlow } from '@/components/create-yours/ImageCreateFlow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { useRouter } from 'next/navigation';
import { PreUploadView } from '@/components/PreUploadView';

export default function CreateImagePage() {
    const router = useRouter();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                setUploadedImage(result);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <ProtectedRoute>
            {!uploadedImage ? (
                <PreUploadView type="image" onUpload={handleUpload} />
            ) : (
                <div className="h-screen overflow-hidden pt-20 pb-10 px-4 flex flex-col">
                    <div className="flex-1 min-h-0">
                        <ImageCreateFlow
                            initialReferenceImage={uploadedImage}
                            onCancel={() => setUploadedImage(null)}
                        />
                    </div>
                </div>
            )}

            {/* Onboarding Popup - Only show if we are in the flow? Or maybe suppress it if using PreUpload?
                The PreUploadView replaces the onboarding conceptually for the upload part. 
                But the user might still want the guide inside the tool.
                We'll keep it but maybe it triggers after upload? 
                Actually the user said "mini pop up OF THAT PAGE".
                Meaning the onboarding popup IS the source of truth for the video.
                So we can keep it.
             */}
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
