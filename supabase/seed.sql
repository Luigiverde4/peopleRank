-- Demo room with fictional people: 40 names, 5 groups and 3 participants with placements.
-- Open it at /r/demo4bsala2026 (the room is already revealed so every view and metric shows data).

select setseed(0.42);

insert into public.rooms (id, slug, name, created_by, revealed)
values (
  '00000000-0000-4000-8000-000000000001',
  'demo4bsala2026',
  'Demo 4ºB',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

insert into public.people (room_id, name, created_at)
select
  '00000000-0000-4000-8000-000000000001',
  person_name,
  now() + make_interval(secs => ordinality)
from unnest(array[
  'Adela Robles', 'Bruno Ferrer', 'Celia Montes', 'Dario Vidal', 'Elena Quiroga',
  'Fabio Lozano', 'Gloria Navas', 'Héctor Prieto', 'Inés Valero', 'Jaime Ortega',
  'Karen Solís', 'Leo Marín', 'Marta Cabello', 'Nico Benet', 'Olga Ramos',
  'Pau Serrano', 'Queralt Mas', 'Rubén Toledo', 'Silvia Arce', 'Tomás Rey',
  'Uxía Pardo', 'Vicente Gil', 'Wendy Calvo', 'Xavi Llorens', 'Yaiza Duran',
  'Zacarías Peña', 'Alba Rius', 'Bernat Soler', 'Carla Vega', 'David Moya',
  'Emma Sáez', 'Félix Cano', 'Greta Muñoz', 'Hugo Bravo', 'Irene Lago',
  'Joel Campos', 'Lara Pons', 'Marc Riera', 'Noa Esteve', 'Óliver Sanz'
]) with ordinality as person_name;

insert into public.groups (id, room_id, name, color) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'Fútbol', '#e11d48'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001', 'Teatro', '#2563eb'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001', 'Gamers', '#16a34a'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000001', 'Música', '#d97706'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-000000000001', 'Debate', '#7c3aed');

-- Everyone belongs to one group by position; every 6th person also to a second one (bridges).
with numbered as (
  select id, row_number() over (order by created_at) - 1 as n
  from public.people
  where room_id = '00000000-0000-4000-8000-000000000001'
),
group_list as (
  select id, row_number() over (order by id) - 1 as g
  from public.groups
  where room_id = '00000000-0000-4000-8000-000000000001'
)
insert into public.person_groups (person_id, group_id, room_id)
select numbered.id, group_list.id, '00000000-0000-4000-8000-000000000001'
from numbered
join group_list on group_list.g = numbered.n % 5
   or (numbered.n % 6 = 0 and group_list.g = (numbered.n + 2) % 5);

-- Three participants; the first two are linked to a person of the list.
insert into public.participants (id, room_id, user_id, display_name, person_id)
values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a1', 'Adela',
   (select id from public.people where name = 'Adela Robles')),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a2', 'Bruno',
   (select id from public.people where name = 'Bruno Ferrer')),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a3', 'Invitado', null);

-- Each person has a "true" position; each participant adds their own noise and skips ~10%.
with base as (
  select id, random() as bx, random() as by
  from public.people
  where room_id = '00000000-0000-4000-8000-000000000001'
),
voters as (
  select id, row_number() over (order by id) as k
  from public.participants
  where room_id = '00000000-0000-4000-8000-000000000001'
)
insert into public.placements (participant_id, person_id, room_id, x, y)
select
  voters.id,
  base.id,
  '00000000-0000-4000-8000-000000000001',
  least(1, greatest(0, base.bx + (random() - 0.5) * 0.15 * voters.k)),
  least(1, greatest(0, base.by + (random() - 0.5) * 0.15 * voters.k))
from base
cross join voters
where random() > 0.1;
