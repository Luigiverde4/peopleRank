-- Game modes, fixed per room:
--   'vs'      each participant has their own board (blind until revealed), then they are compared.
--   'general' one shared board that every member moves, discussed live on the call.

alter table public.rooms
  add column mode text not null default 'vs' check (mode in ('vs', 'general'));

-- One position per person on the shared board of a 'general' room.
create table public.shared_placements (
  room_id uuid not null references public.rooms (id) on delete cascade,
  person_id uuid not null,
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  -- Participant who moved it last (kept for display; cleared if they leave).
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (room_id, person_id),
  foreign key (person_id, room_id) references public.people (id, room_id) on delete cascade,
  foreign key (updated_by, room_id) references public.participants (id, room_id) on delete set null (updated_by)
);

create index shared_placements_person_id_idx on public.shared_placements (person_id);

create trigger shared_placements_set_updated_at
before update on public.shared_placements
for each row execute function public.set_updated_at();

create function public.is_general_room(room uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.mode = 'general' from public.rooms r where r.id = room), false);
$$;

revoke all on public.shared_placements from anon, authenticated;
-- Upserts need update on every column sent.
grant select, insert, update, delete on public.shared_placements to authenticated;

alter table public.shared_placements enable row level security;

-- Any member reads and moves the shared board, only in 'general' rooms, and only signing as themself.
create policy "shared_placements: members read" on public.shared_placements
  for select to authenticated using (public.is_room_member(room_id));
create policy "shared_placements: members insert" on public.shared_placements
  for insert to authenticated
  with check (
    public.is_room_member(room_id)
    and public.is_general_room(room_id)
    and (updated_by is null or public.owns_participant(updated_by))
  );
create policy "shared_placements: members update" on public.shared_placements
  for update to authenticated
  using (public.is_room_member(room_id))
  with check (
    public.is_room_member(room_id)
    and public.is_general_room(room_id)
    and (updated_by is null or public.owns_participant(updated_by))
  );
create policy "shared_placements: members delete" on public.shared_placements
  for delete to authenticated using (public.is_room_member(room_id));

alter publication supabase_realtime add table public.shared_placements;

-- create_room gains the mode (the old two-argument version is replaced).
drop function public.create_room(text, text);

create function public.create_room(name text, display_name text, mode text default 'vs') returns text
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

  insert into public.rooms (slug, name, created_by, mode)
  values (public.generate_slug(), trim(create_room.name), (select auth.uid()), create_room.mode)
  returning * into new_room;

  insert into public.participants (room_id, user_id, display_name)
  values (new_room.id, (select auth.uid()), trim(create_room.display_name));

  return new_room.slug;
end;
$$;

revoke execute on function public.create_room(text, text, text) from public, anon;
grant execute on function public.create_room(text, text, text) to authenticated;
