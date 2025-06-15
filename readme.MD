/* ───────────────────────────────────────────────────────────────
   0.  Extensions & settings
   ─────────────────────────────────────────────────────────────── */
create extension if not exists "uuid-ossp";
set check_function_bodies = off;

/* Always lock SECURITY DEFINER funcs to public schema */
set search_path = public, extensions;

/* ───────────────────────────────────────────────────────────────
   1.  Core tables
   ─────────────────────────────────────────────────────────────── */
-- a) doctors ----------------------------------------------------
create table if not exists doctors (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references auth.users on delete cascade not null,
  name                 text not null,
  specialization       text not null,
  license_number       text unique not null,
  phone                text,
  email                text unique not null,
  bio                  text,
  appointment_duration int  default 30 check (appointment_duration between 10 and 120),
  organization_name    text,
  is_active            boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  updated_by           text
);
-- ▸ performance: used in every RLS check
create index if not exists idx_doctors_user_id on doctors(user_id);

-- b) patients ---------------------------------------------------
create table if not exists patients (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  name            text not null,
  gender          text not null check (gender in ('male','female')),
  date_of_birth   date not null,
  national_id     char(10) unique not null check (national_id ~ '^[0-9]{10}$'),
  nationality     text not null,
  phone_number    text not null check (phone_number ~ '^\+9665[0-9]{8}$'),
  medical_history text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  updated_by      text
);
create index if not exists idx_patients_user_id on patients(user_id);

-- c) appointments ----------------------------------------------
create table if not exists appointments (
  id            uuid primary key default uuid_generate_v4(),
  doctor_id     uuid references doctors(id)   on delete cascade not null,
  patient_id    uuid references patients(id)  on delete cascade not null,
  patient_name  text  not null,
  date          date  not null,
  time          time  not null,
  status        text  not null default 'scheduled'
               check (status in ('scheduled','cancelled','completed','attended')),
  notes         text,
  organization_name text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  updated_by    text,
  /* hard constraint: a doctor can’t double‑book the same slot */
  unique (doctor_id, date, time)
);
create index if not exists idx_appt_doctor_date on appointments(doctor_id, date);
create index if not exists idx_appt_patient   on appointments(patient_id);

-- d) admins -----------------------------------------------------
create table if not exists admins (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null unique,
  name          text not null,
  email         text unique not null,
  organization_name text,
  national_id   char(10) unique,
  nationality   text,
  phone_number  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  updated_by    text
);
create index if not exists idx_admins_user_id on admins(user_id);

/* ───────────────────────────────────────────────────────────────
   2.  Generic updated_at / updated_by trigger
   ─────────────────────────────────────────────────────────────── */
create or replace function set_updated_fields()
returns trigger language plpgsql security definer as $$
declare current_updater text;
begin
  new.updated_at := now();

  select coalesce(
    (select name from doctors where user_id = auth.uid() limit 1),
    (select name from admins  where user_id = auth.uid() limit 1),
    'system'
  ) into current_updater;

  new.updated_by := current_updater;
  return new;
end;
$$;

create or replace trigger tg_doctors_upd  before update on doctors      for each row execute function set_updated_fields();
create or replace trigger tg_patients_upd before update on patients     for each row execute function set_updated_fields();
create or replace trigger tg_appt_upd     before update on appointments for each row execute function set_updated_fields();
create or replace trigger tg_admins_upd   before update on admins       for each row execute function set_updated_fields();

/* ───────────────────────────────────────────────────────────────
   3.  Sync organization_name into appointments whenever doctor updates it
   ─────────────────────────────────────────────────────────────── */
create or replace function sync_appt_org_name()
returns trigger language plpgsql security definer as $$
begin
  update appointments
     set organization_name = new.organization_name,
         updated_at        = now()
   where doctor_id = new.id;
  return new;
end;
$$;

drop trigger if exists tg_sync_org on doctors;
create trigger tg_sync_org
after update of organization_name on doctors
for each row execute function sync_appt_org_name();

/* ───────────────────────────────────────────────────────────────
   4.  Auto‑provision profile row on auth signup
   ─────────────────────────────────────────────────────────────── */
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'doctor' then
    insert into doctors (user_id, name, email, specialization, license_number)
    values ( new.id,
             coalesce(new.raw_user_meta_data->>'full_name','Doctor'),
             new.email,
             coalesce(new.raw_user_meta_data->>'specialization','General'),
             coalesce(new.raw_user_meta_data->>'license_number','TBD') );

  elsif new.raw_user_meta_data ->> 'role' = 'admin' then
    insert into admins (user_id, name, email)
    values ( new.id,
             coalesce(new.raw_user_meta_data->>'full_name','Admin'),
             new.email );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

/* ───────────────────────────────────────────────────────────────
   5.  Row‑Level Security
   ─────────────────────────────────────────────────────────────── */
alter table doctors      enable row level security;
alter table patients     enable row level security;
alter table appointments enable row level security;
alter table admins       enable row level security;

-- doctors -------------------------------------------------------
create policy p_doctors_rw on doctors
  using  (auth.uid() = user_id or exists (select 1 from admins where user_id = auth.uid()))
  with check (auth.uid() = user_id);

-- patients ------------------------------------------------------
create policy p_patients_rw on patients
  using  (auth.uid() = user_id or exists (select 1 from admins where user_id = auth.uid()))
  with check (auth.uid() = user_id);

-- appointments --------------------------------------------------
create policy p_appt_rw on appointments
  using ( exists (select 1 from doctors  d where d.id = doctor_id  and d.user_id = auth.uid())
       or exists (select 1 from patients p where p.id = patient_id and p.user_id = auth.uid())
       or exists (select 1 from admins   a where a.user_id = auth.uid()) )
  with check (exists (select 1 from doctors d where d.id = doctor_id and d.user_id = auth.uid()));

-- admins --------------------------------------------------------
create policy p_admins_rw on admins
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

