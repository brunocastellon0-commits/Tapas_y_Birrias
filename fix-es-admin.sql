-- ============================================================
-- MEJORA: es_admin() busca por nombre en vez de hardcodear ID
-- ============================================================
-- Antes usaba: cargo_id = 1 (falla si el admin tiene otro ID)
-- Ahora busca: nombre = 'Administrador' en la tabla cargos

CREATE OR REPLACE FUNCTION es_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    es_administrador boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM usuarios u
        JOIN cargos c ON u.cargo_id = c.id
        WHERE u.id = auth.uid() AND c.nombre = 'Administrador'
    ) INTO es_administrador;

    RETURN es_administrador;
END;
$$;
