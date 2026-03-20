-- Add handed_to_supervisor_id to novelties
alter table novelties
  add column if not exists handed_to_supervisor_id uuid references profiles(id) on delete set null;

-- Handover operators table (received_from and handed_to employees)
create table if not exists novelty_handover_operators (
  id uuid primary key default uuid_generate_v4(),
  novelty_id uuid not null references novelties(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  direction text not null check (direction in ('received_from', 'handed_to')),
  created_at timestamptz not null default now()
);

-- RLS
alter table novelty_handover_operators enable row level security;

create policy "Allow access to novelty handover operators based on novelty access"
  on novelty_handover_operators for all using (
    exists (
      select 1 from novelties n
      join profiles p on p.id = auth.uid()
      where n.id = novelty_handover_operators.novelty_id
      and (
        p.role in ('admin', 'co_admin', 'hr')
        or p.id = n.supervisor_id
        or (p.role = 'supervisor' and p.shift_id = n.shift_id)
      )
    )
  );
