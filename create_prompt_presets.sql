-- Create prompt_presets table
CREATE TABLE IF NOT EXISTS prompt_presets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL, -- 'living_background', 'transition', etc.
    label TEXT NOT NULL,
    description TEXT, -- Short description for the UI
    prompt_template TEXT NOT NULL, -- The full prompt text
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prompt_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Everyone can read prompt_presets" 
    ON prompt_presets FOR SELECT 
    USING (true);

-- Policy: Only admin (or everyone for now based on current lab auth) can insert/update/delete
-- Assuming no specific auth restriction for Lab yet aside from the email check in UI, 
-- but for RLS we might need a role or checking email. 
-- For now, letting authenticated users modify if they are in Lab (client-side check). 
-- ideally strictly controlled, but implementing permissible policy for now as requested for Lab features.
CREATE POLICY "Authenticated users can modify prompt_presets" 
    ON prompt_presets FOR ALL 
    USING (auth.role() = 'authenticated');

-- Insert default data
INSERT INTO prompt_presets (category, label, description, prompt_template, is_default) VALUES
(
    'living_background',
    'Natura (fulles, herba)',
    '...soft wind rustling through leaves and tall grass.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Soft wind rustling through leaves and tall grass. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Ciutat (llums, trànsit)',
    '...shimmering city lights, gentle car movement blur.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Shimmering city lights, gentle car movement blur, and light atmospheric haze. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Aigua (mar, riu, pluja)',
    '...gentle water ripples, distant waves, or soft rain.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Gentle water ripples, distant waves, or soft rain falling. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Cels (núvols, fum)',
    '...slow-moving clouds, drifting smoke.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Slow-moving clouds, drifting smoke, or subtle atmospheric fog. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Fons abstractes/decolorats',
    '...gradual color shifts, subtle light pulsations.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Gradual color shifts, subtle light pulsations, or slowly swirling bokeh effects. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Neu / Partícules',
    '...light snowfall, gentle drifting snow.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Light snowfall, gentle drifting snow, or subtle floating dust. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
),
(
    'living_background',
    'Objectes en moviment (subtil)',
    '...slowly rotating fan or a distant flag waving.',
    'The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Very subtle movement of distant objects like a slowly rotating fan or a distant flag waving gently. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution.',
    false
);
