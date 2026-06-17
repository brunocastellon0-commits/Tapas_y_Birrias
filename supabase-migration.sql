-- ============================================================
-- Migration: Apertura y Cierre de Caja
-- ============================================================

-- Aperturas de caja
CREATE TABLE aperturas_caja (
    id int generated always as identity primary key,
    sucursal_id int references sucursales(id),
    usuario_id uuid references usuarios(id),
    monto_efectivo numeric(10,2) not null default 0,
    monto_qr numeric(10,2) not null default 0,
    monto_tarjeta numeric(10,2) not null default 0,
    corte_efectivo jsonb not null default '[]',
    abierta boolean default true,
    created_at timestamptz default now()
);

-- Cierres de caja
CREATE TABLE cierres_caja (
    id int generated always as identity primary key,
    apertura_id int references aperturas_caja(id),
    usuario_id uuid references usuarios(id),
    monto_efectivo numeric(10,2) not null,
    monto_qr numeric(10,2) not null,
    monto_tarjeta numeric(10,2) not null,
    corte_efectivo jsonb not null,
    diferencia numeric(10,2) not null default 0,
    observaciones text,
    created_at timestamptz default now()
);
