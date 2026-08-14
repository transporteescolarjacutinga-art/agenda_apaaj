-- ============================================================================
-- ESQUEMA ORIGINAL SUPABASE - TABELA PUBLIC.APPOINTMENTS E PUBLIC.MONITORS
-- ============================================================================

-- Tabela Principal de Agendamentos e Ocorrências Diárias
create table if not exists public.appointments (
    id text primary key,
    base_id text default '',
    data date,
    data_fim date,
    profissional text default '',
    tipo text default '',
    paciente text default '',
    dia text default '',
    turno text default '',
    inicio time,
    termino time,
    escola text default '',
    telefone text default '',
    transporte text default 'Ambos',
    obs text default '',
    status text default '',
    monitora text default '',
    gps_buscado_escola text default '',
    timestamp_buscado_escola text default '',
    gps_entregue_ong text default '',
    timestamp_entregue_ong text default '',
    gps_saida_ong text default '',
    timestamp_saida_ong text default '',
    gps_devolvido_escola text default '',
    timestamp_devolvido_escola text default '',
    ausencia_motivo text default '',
    ausencia_timestamp text default '',
    ausencia_gps text default '',
    created_at timestamptz default now()
);

-- Garantia de Colunas em Migração
alter table public.appointments
    add column if not exists base_id text default '',
    add column if not exists data_fim date,
    add column if not exists gps_buscado_escola text default '',
    add column if not exists timestamp_buscado_escola text default '',
    add column if not exists gps_entregue_ong text default '',
    add column if not exists timestamp_entregue_ong text default '',
    add column if not exists gps_saida_ong text default '',
    add column if not exists timestamp_saida_ong text default '',
    add column if not exists gps_devolvido_escola text default '',
    add column if not exists timestamp_devolvido_escola text default '',
    add column if not exists ausencia_motivo text default '',
    add column if not exists ausencia_timestamp text default '',
    add column if not exists ausencia_gps text default '';

-- Tabela de Monitoras de Transporte
create table if not exists public.monitors (
    id text primary key,
    monitora text not null unique,
    created_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table public.appointments enable row level security;
alter table public.monitors enable row level security;

-- Políticas de Acesso Público Total
drop policy if exists "public appointments select" on public.appointments;
drop policy if exists "public appointments insert" on public.appointments;
drop policy if exists "public appointments update" on public.appointments;
drop policy if exists "public appointments delete" on public.appointments;

create policy "public appointments select" on public.appointments for select to anon using (true);
create policy "public appointments insert" on public.appointments for insert to anon with check (true);
create policy "public appointments update" on public.appointments for update to anon using (true) with check (true);
create policy "public appointments delete" on public.appointments for delete to anon using (true);

drop policy if exists "public monitors select" on public.monitors;
drop policy if exists "public monitors insert" on public.monitors;
drop policy if exists "public monitors delete" on public.monitors;

create policy "public monitors select" on public.monitors for select to anon using (true);
create policy "public monitors insert" on public.monitors for insert to anon with check (true);
create policy "public monitors delete" on public.monitors for delete to anon using (true);
