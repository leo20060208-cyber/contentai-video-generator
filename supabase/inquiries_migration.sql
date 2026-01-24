-- Create business_inquiries table
create table if not exists public.business_inquiries (
    id uuid default gen_random_uuid() primary key,
    name text, -- Optional if not in form
    email text not null,
    phone text,
    message text,
    status text default 'new', -- new, contacted, archived
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.business_inquiries enable row level security;

-- Policies
create policy "Anyone can insert inquiries"
    on public.business_inquiries for insert
    with check (true);

create policy "Admins can view inquiries"
    on public.business_inquiries for select
    using (auth.role() = 'authenticated');

create policy "Admins can update inquiries"
    on public.business_inquiries for update
    using (auth.role() = 'authenticated');

create policy "Admins can delete inquiries"
    on public.business_inquiries for delete
    using (auth.role() = 'authenticated');
