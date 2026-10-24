-- peopleRank initial schema: tables, indexes, RLS, RPCs, realtime and storage.
-- Coordinates are normalized to [0, 1] with y = 1 at the top.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) >= 12),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null,
  revealed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  photo_path text,
  created_at timestamptz not null default now(),
  -- Target of composite foreign keys that keep room_id consistent.
  unique (id, room_id)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  person_id uuid,
  created_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (id, room_id),
  -- Deleting the person only unlinks the participant (PG 15+ column list).
  foreign key (person_id, room_id) references public.people (id, room_id) on delete set null (person_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, room_id)
);

create table public.person_groups (
  person_id uuid not null,
  group_id uuid not null,
  -- Redundant, so Realtime can filter by room.
  room_id uuid not null references public.rooms (id) on delete cascade,
  primary key (person_id, group_id),
  foreign key (person_id, room_id) references public.people (id, room_id) on delete cascade,
  foreign key (group_id, room_id) references public.groups (id, room_id) on delete cascade
);

create table public.placements (
  participant_id uuid not null,
  person_id uuid not null,
  room_id uuid not null references public.rooms (id) on delete cascade,
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (participant_id, person_id),
  foreign key (participant_id, room_id) references public.participants (id, room_id) on delete cascade,
  foreign key (person_id, room_id) references public.people (id, room_id) on delete cascade
);

create index people_room_id_idx on public.people (room_id);
create index participants_room_id_idx on public.participants (room_id);
create index participants_user_id_idx on public.participants (user_id);
create index groups_room_id_idx on public.groups (room_id);
create index person_groups_room_id_idx on public.person_groups (room_id);
create index person_groups_group_id_idx on public.person_groups (group_id);
create index placements_room_id_idx on public.placements (room_id);
create index placements_person_id_idx on public.placements (person_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger placements_set_updated_at
before update on public.placements
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions used by the policies (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------------

create function public.is_room_member(room uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants p
    where p.room_id = room and p.user_id = (select auth.uid())
  );
$$;

create function public.owns_participant(participant uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants p
    where p.id = participant and p.user_id = (select auth.uid())
  );
$$;

create function public.is_room_revealed(room uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.revealed from public.rooms r where r.id = room), false);
$$;

-- ---------------------------------------------------------------------------
-- Privileges: only signed-in users (anonymous auth uses the authenticated role)
-- ---------------------------------------------------------------------------

revoke all on public.rooms, public.participants, public.people, public.groups,
  public.person_groups, public.placements from anon, authenticated;

grant select on public.rooms to authenticated;
grant update (revealed) on public.rooms to authenticated;
grant select on public.participants to authenticated;
grant update (display_name, person_id) on public.participants to authenticated;
grant select, insert, delete on public.people to authenticated;
grant update (name, photo_path) on public.people to authenticated;
grant select, insert, delete on public.groups to authenticated;
grant update (name, color) on public.groups to authenticated;
grant select, insert, delete on public.person_groups to authenticated;
-- Upserts (insert ... on conflict do update) need update on every column sent.
grant select, insert, update, delete on public.placements to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.people enable row level security;
alter table public.groups enable row level security;
alter table public.person_groups enable row level security;
alter table public.placements enable row level security;

-- rooms: members read; only the creator changes `revealed` (column grant above).
create policy "rooms: members read" on public.rooms
  for select to authenticated using (public.is_room_member(id));
create policy "rooms: creator reveals" on public.rooms
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- participants: members read; each one edits only their own row.
create policy "participants: members read" on public.participants
  for select to authenticated using (public.is_room_member(room_id));
create policy "participants: update own row" on public.participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- people, groups, person_groups: full access for room members.
create policy "people: members read" on public.people
  for select to authenticated using (public.is_room_member(room_id));
create policy "people: members insert" on public.people
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "people: members update" on public.people
  for update to authenticated
  using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
create policy "people: members delete" on public.people
  for delete to authenticated using (public.is_room_member(room_id));

create policy "groups: members read" on public.groups
  for select to authenticated using (public.is_room_member(room_id));
create policy "groups: members insert" on public.groups
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "groups: members update" on public.groups
  for update to authenticated
  using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
create policy "groups: members delete" on public.groups
  for delete to authenticated using (public.is_room_member(room_id));

create policy "person_groups: members read" on public.person_groups
  for select to authenticated using (public.is_room_member(room_id));
create policy "person_groups: members insert" on public.person_groups
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "person_groups: members delete" on public.person_groups
  for delete to authenticated using (public.is_room_member(room_id));

-- placements: own rows always; the others' only once the room is revealed (blind mode).
create policy "placements: read own or revealed" on public.placements
  for select to authenticated
  using (
    public.owns_participant(participant_id)
    or (public.is_room_revealed(room_id) and public.is_room_member(room_id))
  );
create policy "placements: insert own" on public.placements
  for insert to authenticated with check (public.owns_participant(participant_id));
create policy "placements: update own" on public.placements
  for update to authenticated
  using (public.owns_participant(participant_id))
  with check (public.owns_participant(participant_id));
create policy "placements: delete own" on public.placements
  for delete to authenticated using (public.owns_participant(participant_id));

-- ---------------------------------------------------------------------------
-- RPCs: rooms can only be created or joined through these (no listing without the slug)
-- ---------------------------------------------------------------------------

create function public.generate_slug(len integer default 14) returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789abcdefghijklmnopqrstuvwxyz';
  bytes bytea := extensions.gen_random_bytes(len);
  result text := '';
begin
  for i in 0 .. len - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 36) + 1, 1);
  end loop;
  return result;
end;
$$;

create function public.create_room(name text, display_name text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_room public.rooms;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.rooms (slug, name, created_by)
  values (public.generate_slug(), trim(create_room.name), (select auth.uid()))
  returning * into new_room;

  insert into public.participants (room_id, user_id, display_name)
  values (new_room.id, (select auth.uid()), trim(create_room.display_name));

  return new_room.slug;
end;
$$;

create function public.join_room(slug text, display_name text) returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.rooms;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into target from public.rooms r where r.slug = join_room.slug;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  insert into public.participants (room_id, user_id, display_name)
  values (target.id, (select auth.uid()), trim(join_room.display_name))
  on conflict (room_id, user_id) do nothing;

  return target;
end;
$$;

revoke execute on function public.create_room(text, text) from public, anon;
revoke execute on function public.join_room(text, text) from public, anon;
revoke execute on function public.generate_slug(integer) from public, anon, authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.rooms,
  public.participants,
  public.people,
  public.groups,
  public.person_groups,
  public.placements;

-- ---------------------------------------------------------------------------
-- Storage: public `photos` bucket, paths `{room_id}/{uuid}.webp`
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- True when the first folder of the object path is a room the user belongs to.
create function public.is_member_of_photo_room(object_name text) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder text := (storage.foldername(object_name))[1];
begin
  if folder is null or folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_room_member(folder::uuid);
end;
$$;

create policy "photos: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.is_member_of_photo_room(name));
create policy "photos: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member_of_photo_room(name));
create policy "photos: members update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.is_member_of_photo_room(name))
  with check (bucket_id = 'photos' and public.is_member_of_photo_room(name));
create policy "photos: members delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_member_of_photo_room(name));
