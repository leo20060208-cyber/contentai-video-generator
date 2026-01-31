-- Add basic video transitions to prompt_presets

INSERT INTO public.prompt_presets (name, description, prompt_template, category)
VALUES
 ('Zoom In', 'Focuses on the center/subject.', 'Camera Movement: Slow, steady zoom in towards the center subject. Maintain focus.', 'transition'),
 ('Zoom Out', 'Reveals more context.', 'Camera Movement: Slow, steady zoom out to reveal the environment. Maintain focus.', 'transition'),
 ('Pan Left', 'Moves camera view left.', 'Camera Movement: Smooth pan to the left.', 'transition'),
 ('Pan Right', 'Moves camera view right.', 'Camera Movement: Smooth pan to the right.', 'transition'),
 ('Pan Up', 'Moves camera view up.', 'Camera Movement: Smooth tilt/pan upwards.', 'transition'),
 ('Pan Down', 'Moves camera view down.', 'Camera Movement: Smooth tilt/pan downwards.', 'transition');
