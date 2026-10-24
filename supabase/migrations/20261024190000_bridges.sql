-- Bridges between groups, marked by hand: a person of group A who connects with a person of group B.

create table public.bridges (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  group_a_id uuid not null,
  group_b_id uuid not null,
  person_a_id uuid not null,
  person_b_id uuid not null,
  created_at timestamptz not null default now(),
  check (group_a_id <> group_b_id),
  check (person_a_id <> person_b_id),
  -- The app stores each pair with the group ids in a fixed order, so this also blocks mirrored duplicates.
  unique (group_a_id, group_b_id, person_a_id, person_b_id),
  foreign key (group_a_id, room_id) references public.groups (id, room_id) on delete cascade,
  foreign key (group_b_id, room_id) references public.groups (id, room_id) on delete cascade,
  foreign key (person_a_id, room_id) references public.people (id, room_id) on delete cascade,
  foreign key (person_b_id, room_id) references public.people (id, room_id) on delete cascade
);

create index bridges_room_id_idx on public.bridges (room_id);

revoke all on public.bridges from anon, authenticated;
grant select, insert, delete on public.bridges to authenticated;

alter table public.bridges enable row level security;

create policy "bridges: members read" on public.bridges
  for select to authenticated using (public.is_room_member(room_id));
create policy "bridges: members insert" on public.bridges
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "bridges: members delete" on public.bridges
  for delete to authenticated using (public.is_room_member(room_id));

alter publication supabase_realtime add table public.bridges;
