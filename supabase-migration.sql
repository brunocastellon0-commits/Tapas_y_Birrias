-- ============================================================
-- Migration: Auditoría y RLS
-- ============================================================

-- Tabla de auditoría para operaciones críticas
CREATE TABLE auditoria_log (
    id bigint generated always as identity primary key,
    usuario_id uuid references usuarios(id),
    accion text not null,
    entidad text not null,
    entidad_id text,
    detalle jsonb,
    created_at timestamptz default now()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_auditoria_usuario ON auditoria_log(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria_log(entidad, entidad_id);
CREATE INDEX idx_auditoria_created_at ON auditoria_log(created_at);

-- RLS: solo insert y select para usuarios autenticados
ALTER TABLE auditoria_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden insertar auditoria"
    ON auditoria_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden leer auditoria"
    ON auditoria_log FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- RLS para tablas existentes
-- ============================================================

-- Usuarios: cada uno solo puede ver/editar su propio perfil, admins pueden todo
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio perfil"
    ON usuarios FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Usuarios editan su propio perfil"
    ON usuarios FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Productos: todos los autenticados pueden leer, solo admins pueden modificar
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer productos"
    ON productos FOR SELECT
    TO authenticated
    USING (true);

-- Comandas: autenticados pueden leer/insertar/actualizar
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer comandas"
    ON comandas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden crear comandas"
    ON comandas FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar comandas"
    ON comandas FOR UPDATE
    TO authenticated
    USING (true);

-- Pagos: solo insert y select
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer pagos"
    ON pagos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pagos"
    ON pagos FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Movimientos de caja: solo insert y select
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer movimientos"
    ON movimientos_caja FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden crear movimientos"
    ON movimientos_caja FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Aperturas y cierres de caja: solo insert y select
ALTER TABLE aperturas_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer aperturas"
    ON aperturas_caja FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden crear aperturas"
    ON aperturas_caja FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar aperturas"
    ON aperturas_caja FOR UPDATE
    TO authenticated
    USING (true);

ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer cierres"
    ON cierres_caja FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden crear cierres"
    ON cierres_caja FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Mesas y zonas: autenticados pueden todo (CRUD)
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer mesas"
    ON mesas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar mesas"
    ON mesas FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar mesas"
    ON mesas FOR UPDATE
    TO authenticated
    USING (true);

-- Categorías de productos
ALTER TABLE categorias_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer categorias"
    ON categorias_productos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar categorias"
    ON categorias_productos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar categorias"
    ON categorias_productos FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- Función helper para registrar auditoría
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_auditoria(
    p_accion text,
    p_entidad text,
    p_entidad_id text default null,
    p_detalle jsonb default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO auditoria_log (usuario_id, accion, entidad, entidad_id, detalle)
    VALUES (auth.uid(), p_accion, p_entidad, p_entidad_id, p_detalle);
END;
$$;

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
