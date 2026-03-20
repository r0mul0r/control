-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User roles enum
create type user_role as enum ('admin', 'co_admin', 'supervisor', 'hr');

-- Shifts table
create table shifts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_time time not null,
  end_time time not null,
  description text,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role user_role not null default 'supervisor',
  shift_id uuid references shifts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Employees table
create table employees (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  document_id text not null unique,
  position text not null,
  shift_id uuid not null references shifts(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Novelties table
create table novelties (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid not null references shifts(id) on delete restrict,
  supervisor_id uuid not null references profiles(id) on delete restrict,
  received_from_supervisor_id uuid references profiles(id) on delete set null,
  handed_to_supervisor_id uuid references profiles(id) on delete set null,
  received_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Novelty operators (who was working that shift)
create table novelty_operators (
  id uuid primary key default uuid_generate_v4(),
  novelty_id uuid not null references novelties(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  is_present boolean not null default true,
  created_at timestamptz not null default now(),
  unique(novelty_id, employee_id)
);

-- Handover operators (who handed/received the shift, separate from regular operators)
create table novelty_handover_operators (
  id uuid primary key default uuid_generate_v4(),
  novelty_id uuid not null references novelties(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  direction text not null check (direction in ('received_from', 'handed_to')),
  created_at timestamptz not null default now()
);

-- Shift changes within a novelty
create table shift_changes (
  id uuid primary key default uuid_generate_v4(),
  novelty_id uuid not null references novelties(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  from_shift_id uuid not null references shifts(id) on delete restrict,
  to_shift_id uuid not null references shifts(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

-- Updated_at triggers
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shifts_updated_at before update on shifts
  for each row execute function handle_updated_at();

create trigger profiles_updated_at before update on profiles
  for each row execute function handle_updated_at();

create trigger employees_updated_at before update on employees
  for each row execute function handle_updated_at();

create trigger novelties_updated_at before update on novelties
  for each row execute function handle_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'supervisor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table employees enable row level security;
alter table novelties enable row level security;
alter table novelty_operators enable row level security;
alter table novelty_handover_operators enable row level security;
alter table shift_changes enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'co_admin', 'hr'))
  );

create policy "Admin can manage profiles"
  on profiles for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Shifts policies
create policy "All authenticated can view shifts"
  on shifts for select using (auth.role() = 'authenticated');

create policy "Admin can manage shifts"
  on shifts for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Employees policies
create policy "Admin and co-admin can manage employees"
  on employees for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'co_admin'))
  );

create policy "HR can view employees"
  on employees for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'hr')
  );

create policy "Supervisor can view their shift employees"
  on employees for select using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'supervisor'
      and shift_id = employees.shift_id
    )
  );

-- Novelties policies
create policy "Supervisors can manage their own novelties"
  on novelties for all using (
    exists (select 1 from profiles where id = auth.uid() and id = novelties.supervisor_id)
  );

create policy "Admin and co-admin can manage all novelties"
  on novelties for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'co_admin'))
  );

create policy "HR can view all novelties"
  on novelties for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'hr')
  );

create policy "Supervisors can view their shift novelties"
  on novelties for select using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'supervisor'
      and shift_id = novelties.shift_id
    )
  );

-- Novelty operators policies
create policy "Allow access to novelty operators based on novelty access"
  on novelty_operators for all using (
    exists (
      select 1 from novelties n
      join profiles p on p.id = auth.uid()
      where n.id = novelty_operators.novelty_id
      and (
        p.role in ('admin', 'co_admin', 'hr')
        or p.id = n.supervisor_id
        or (p.role = 'supervisor' and p.shift_id = n.shift_id)
      )
    )
  );

-- Novelty handover operators policies
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

-- Shift changes policies
create policy "Allow access to shift changes based on novelty access"
  on shift_changes for all using (
    exists (
      select 1 from novelties n
      join profiles p on p.id = auth.uid()
      where n.id = shift_changes.novelty_id
      and (
        p.role in ('admin', 'co_admin', 'hr')
        or p.id = n.supervisor_id
        or (p.role = 'supervisor' and p.shift_id = n.shift_id)
      )
    )
  );
