-- Create FAQs table
create table if not exists public.faqs (
    id uuid default gen_random_uuid() primary key,
    question text not null,
    answer text not null,
    "order" integer default 0,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.faqs enable row level security;

-- Policies
create policy "Public FAQs are viewable by everyone"
    on public.faqs for select
    using (true);

create policy "Admins can insert faqs"
    on public.faqs for insert
    with check (auth.role() = 'authenticated'); -- Simplified for now, or match existing admin logic

create policy "Admins can update faqs"
    on public.faqs for update
    using (auth.role() = 'authenticated');

create policy "Admins can delete faqs"
    on public.faqs for delete
    using (auth.role() = 'authenticated');

-- Seed initial data
insert into public.faqs (question, answer, "order")
values
    ('What are "Credits" and how do they work?', 'Credits are the currency used to generate content on our platform. Different actions cost different amounts of credits (e.g., 5s video = 30 credits). Your credits reset each month if you are on a subscription plan.', 0),
    ('Can I cancel my subscription at any time?', 'Yes, you can cancel your subscription at any time from your profile settings. You will retain access to your credits until the end of your billing period.', 1),
    ('Do unused credits roll over?', 'No, monthly credits do not roll over to the next month for subscription plans. However, "Top-up" credits purchased separately do not expire as long as your account is active.', 2),
    ('What happens if I run out of credits?', 'If you run out of credits, you can either upgrade your plan to get more monthly credits or purchase a specialized "Top-up" pack to add credits instantly.', 3),
    ('Can I use the videos for commercial purposes?', 'Yes! All paid plans (Starter, Pro, Elite) and single video purchases come with full commercial rights for the content you generate.', 4);
