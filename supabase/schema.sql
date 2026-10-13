create table if not exists fact_check_sessions (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress','awaiting_clarification','completed','rejected')),
  clarification_round int not null default 0,
  claim_context jsonb not null default '{"claim":"","details":[]}',
  pending_questions jsonb,
  final_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only the server (service role key) may touch this table.
alter table fact_check_sessions enable row level security;
