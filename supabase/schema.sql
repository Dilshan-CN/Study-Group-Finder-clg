-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables (clean slate)
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists room_member_activity on room_members;
drop table if exists room_members cascade;
drop table if exists rooms cascade;
drop table if exists profiles cascade;
drop function if exists handle_new_user() cascade;
drop function if exists update_room_activity() cascade;
drop function if exists cleanup_inactive_rooms() cascade;

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Rooms
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  room_name text not null,
  subject text not null,
  max_people integer not null check (max_people >= 1 and max_people <= 50),
  created_by uuid references profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

-- Room Members
create table room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- Indexes
create index idx_rooms_status on rooms(status);
create index idx_rooms_last_activity on rooms(last_activity);
create index idx_room_members_room_id on room_members(room_id);
create index idx_room_members_user_id on room_members(user_id);

-- Enable RLS
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;

-- Profiles policies
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Rooms policies
create policy "rooms_select" on rooms for select using (status = 'active');
create policy "rooms_insert" on rooms for insert with check (auth.uid() is not null);
create policy "rooms_update" on rooms for update using (true);
create policy "rooms_delete" on rooms for delete using (true);

-- Room members policies
create policy "room_members_select" on room_members for select using (true);
create policy "room_members_insert" on room_members for insert with check (auth.uid() = user_id);
create policy "room_members_delete" on room_members for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Update last_activity and delete empty rooms
create or replace function update_room_activity()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update rooms set last_activity = now() where id = NEW.room_id;
  elsif TG_OP = 'DELETE' then
    update rooms set last_activity = now() where id = OLD.room_id;
    delete from rooms
    where id = OLD.room_id
      and not exists (select 1 from room_members where room_id = OLD.room_id);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger room_member_activity
  after insert or delete on room_members
  for each row execute function update_room_activity();

-- Cleanup inactive rooms (called via RPC from frontend)
create or replace function cleanup_inactive_rooms()
returns void language plpgsql security definer as $$
begin
  update rooms
  set status = 'inactive'
  where status = 'active'
    and last_activity < now() - interval '30 minutes';

  delete from rooms where status = 'inactive';

  delete from rooms
  where id not in (select distinct room_id from room_members);
end;
$$;