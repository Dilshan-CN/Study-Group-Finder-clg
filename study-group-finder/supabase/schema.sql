-- Enable UUID extension
create extension if not exists "uuid-ossp";

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
create policy "Users can read all profiles"
  on profiles for select using (true);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Rooms policies
create policy "Anyone can read active rooms"
  on rooms for select using (status = 'active');

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.uid() is not null);

create policy "Room creators can update their rooms"
  on rooms for update using (auth.uid() = created_by);

create policy "Allow system to update rooms"
  on rooms for update using (true);

create policy "Allow system to delete rooms"
  on rooms for delete using (true);

-- Room members policies
create policy "Members can read room_members"
  on room_members for select using (true);

create policy "Authenticated users can join rooms"
  on room_members for insert with check (auth.uid() = user_id);

create policy "Users can leave rooms"
  on room_members for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Cleanup: delete rooms with no members or inactive for 30+ minutes
create or replace function cleanup_inactive_rooms()
returns void language plpgsql security definer as $$
begin
  -- Delete rooms with no members
  delete from rooms
  where id not in (select distinct room_id from room_members);

  -- Mark rooms inactive if no activity for 30 minutes
  update rooms
  set status = 'inactive'
  where status = 'active'
    and last_activity < now() - interval '30 minutes';

  -- Delete inactive rooms
  delete from rooms where status = 'inactive';
end;
$$;

-- Update last_activity when a member joins or leaves
create or replace function update_room_activity()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update rooms set last_activity = now() where id = NEW.room_id;
  elsif TG_OP = 'DELETE' then
    update rooms set last_activity = now() where id = OLD.room_id;
    -- Delete room if no members remain
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

-- Schedule cleanup every 5 minutes using pg_cron (enable pg_cron extension in Supabase dashboard first)
-- select cron.schedule('cleanup-inactive-rooms', '*/5 * * * *', 'select cleanup_inactive_rooms()');

-- Alternatively, call cleanup_inactive_rooms() via a Supabase Edge Function on a schedule,
-- or invoke it from the frontend on page load (see Rooms.jsx).
