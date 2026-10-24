-- Subgroups: a group may live inside another group of the same room (two levels at most).
-- Membership is stored directly; belonging to a subgroup implies belonging to its parent (derived in the app).

alter table public.groups add column parent_id uuid;

alter table public.groups
  add constraint groups_parent_fk foreign key (parent_id, room_id)
    references public.groups (id, room_id) on delete set null (parent_id),
  add constraint groups_not_own_parent check (parent_id is null or parent_id <> id);

create index groups_parent_id_idx on public.groups (parent_id);

-- Two levels: a subgroup cannot contain subgroups, and a group with subgroups cannot become one.
create function public.check_group_depth() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if exists (select 1 from public.groups g where g.id = new.parent_id and g.parent_id is not null) then
    raise exception 'A subgroup cannot contain subgroups' using errcode = '23514';
  end if;
  if exists (select 1 from public.groups g where g.parent_id = new.id) then
    raise exception 'A group with subgroups cannot become a subgroup' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger groups_check_depth
before insert or update of parent_id on public.groups
for each row execute function public.check_group_depth();

grant update (parent_id) on public.groups to authenticated;
