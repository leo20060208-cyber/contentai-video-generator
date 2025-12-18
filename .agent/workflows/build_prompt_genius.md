---
description: Build the Prompt Genius tool in the Lab
---

# Plan: "Prompt Genius" - Advanced Video Prompt Generator

This workflow creates a specialized tool in the Admin Lab to generate high-quality, logic-aware prompts for video templates.

## 1. Backend: The "Prompt Brain" (API)
We will create a specific endpoint `app/api/lab/generate-prompt/route.ts` that functionality mirrors the SaaS "recreation" logic but focuses on *extraction* and *templating*.
- **Model**: Gemini 1.5 Pro (best for video reasoning).
- **Input**: Video file + "Hero Object Description" (e.g., "a bottle of soda").
- **Output**: 
    - `technical_prompt`: Detailed description of camera, lighting, and motion (for `hidden_prompt`).
    - `template_structure`: A prompt with a placeholder `[THE PRODUCT]` that perfectly describes the action happening to the object.
    - `image_instructions`: Suggestion on what kind of image fits this video (e.g., "Use a transparent PNG").

## 2. Frontend: The "Prompt Genius" Component
We will add a new section in the `LabPage` called "Prompt Genius".
- **UI**: 
    - Video Upload (drag & drop).
    - Input field: "What is the main object currently in the video?" (Context).
    - "Generate Magic Prompts" button.
    - **Results Area**:
        - **"The Skeleton Prompt"**: The robust prompt with `[PRODUCT]` placeholder.
        - **"Technical Vibe"**: The camera/lighting keywords.
        - **"Visual Analysis"**: A short summary of what the AI sees (sanity check).

## 3. Integration
- We will use the existing `Gemini` integration but with a heavily tuned System Prompt designed for *Template Creation* (focusing on "agnostic" descriptions that work when the object changes).
- We will ensure it handles video chunks or frame sampling if the video is large.

## Implementation Steps
1.  Create `app/api/lab/gen-prompt/route.ts`.
2.  Create `components/lab/PromptGenius.tsx`.
3.  Add the component to `app/lab/page.tsx` (maybe as a toggle or separate tab).
