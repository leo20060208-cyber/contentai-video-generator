-- Create Table
create table if not exists prompt_presets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  prompt_template text not null,
  preview_video_url text,
  category text default 'living_background',
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if table was already created (Idempotent updates)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'prompt_presets' and column_name = 'preview_video_url') then
    alter table prompt_presets add column preview_video_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'prompt_presets' and column_name = 'category') then
    alter table prompt_presets add column category text default 'living_background';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'prompt_presets' and column_name = 'is_default') then
    alter table prompt_presets add column is_default boolean default false;
  end if;
end $$;

-- Enable RLS
alter table prompt_presets enable row level security;

-- Policies (Drop first to ensure they can be re-created without error)
drop policy if exists "Public Read" on prompt_presets;
create policy "Public Read" on prompt_presets for select using (true);

drop policy if exists "Auth Write" on prompt_presets;
create policy "Auth Write" on prompt_presets for insert with check (auth.role() = 'authenticated');

drop policy if exists "Auth Update" on prompt_presets;
create policy "Auth Update" on prompt_presets for update using (auth.role() = 'authenticated');

drop policy if exists "Auth Delete" on prompt_presets;
create policy "Auth Delete" on prompt_presets for delete using (auth.role() = 'authenticated');

-- Seed Data
-- We verify if data exists before inserting to avoid duplicates if possible, or just insert new ones.
-- Since this is a dev seed, we will just insert. Detailed duplication handling would require unique constraints on names.

insert into prompt_presets (name, description, prompt_template, category) values 
('Natura (fulles, herba)', '...soft wind rustling through leaves and tall grass.', 'Soft wind rustling through leaves and tall grass.', 'living_background'),
('Ciutat (llums, trànsit)', '...shimmering city lights, gentle car movement blur, and light atmospheric haze.', 'Shimmering city lights, gentle car movement blur, and light atmospheric haze.', 'living_background'),
('Aigua (mar, riu, pluja)', '...gentle water ripples, distant waves, or soft rain falling.', 'Gentle water ripples, distant waves, or soft rain falling.', 'living_background'),
('Cels (núvols, fum)', '...slow-moving clouds, drifting smoke, or subtle atmospheric fog.', 'Slow-moving clouds, drifting smoke, or subtle atmospheric fog.', 'living_background'),
('Fons abstractes/decolorats', '...gradual color shifts, subtle light pulsations, or slowly swirling bokeh effects.', 'Gradual color shifts, subtle light pulsations, or slowly swirling bokeh effects.', 'living_background'),
('Neu / Partícules', '...light snowfall, gentle drifting snow, or subtle floating dust.', 'Light snowfall, gentle drifting snow, or subtle floating dust.', 'living_background'),
('Objectes en moviment (molt subtil)', '...very subtle movement of distant objects like a slowly rotating fan or a distant flag waving gently.', 'Very subtle movement of distant objects like a slowly rotating fan or a distant flag waving gently.', 'living_background');
