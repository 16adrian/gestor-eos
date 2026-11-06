-- =====================================================================
--  Gestor EOS · Esquema de la base de datos (PostgreSQL)
--  Capa MODELO del MVC. Lo ejecuta `npm run seed` (borra y crea todo).
--  Doble red de validación: el backend valida y, además, la base de datos
--  tiene restricciones (UNIQUE, FOREIGN KEY, CHECK) que nunca se saltan.
-- =====================================================================

DROP VIEW IF EXISTS v_equipos, v_modelos, v_coberturas, v_incidentes, v_ventas CASCADE;
DROP FUNCTION IF EXISTS fn_equipos(date);
DROP TABLE IF EXISTS ventas, incidentes, equipos, coberturas, piezas, modelos,
                     tipos_equipo, marcas, empresas, usuarios CASCADE;

-- ---------- Usuarios (login del administrador) ----------
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol           VARCHAR(20)  NOT NULL DEFAULT 'admin'
);

-- ---------- Catálogos ----------
CREATE TABLE empresas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  ruc    CHAR(13) UNIQUE,                      -- dato sensible: se valida en el backend
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_empresas_ruc CHECK (ruc ~ '^[0-9]{13}$')
);

CREATE TABLE marcas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE tipos_equipo (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE modelos (
  id             SERIAL PRIMARY KEY,
  marca_id       INT NOT NULL REFERENCES marcas(id),
  tipo_id        INT NOT NULL REFERENCES tipos_equipo(id),
  nombre         VARCHAR(120) NOT NULL,
  costo_compra   NUMERIC(10,2) NOT NULL CHECK (costo_compra > 0),
  costo_estimado BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = la empresa aún no da el costo real
  CONSTRAINT uq_modelos_marca_nombre UNIQUE (marca_id, nombre)
);

CREATE TABLE piezas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

-- Qué cubre la garantía de cada marca y cuánto cuesta la pieza si la paga EOS
CREATE TABLE coberturas (
  id        SERIAL PRIMARY KEY,
  marca_id  INT NOT NULL REFERENCES marcas(id),
  pieza_id  INT NOT NULL REFERENCES piezas(id),
  cubre     BOOLEAN NOT NULL,
  costo_min NUMERIC(10,2) CHECK (costo_min >= 0),
  costo_max NUMERIC(10,2) CHECK (costo_max >= 0),
  CONSTRAINT uq_coberturas_marca_pieza UNIQUE (marca_id, pieza_id),
  CONSTRAINT ck_coberturas_rango CHECK (costo_min <= costo_max)
);

-- ---------- Operación ----------
CREATE TABLE equipos (
  id                SERIAL PRIMARY KEY,
  serie             VARCHAR(30) NOT NULL UNIQUE,
  modelo_id         INT NOT NULL REFERENCES modelos(id),
  empresa_id        INT REFERENCES empresas(id),
  tarifa_mensual    NUMERIC(10,2) CHECK (tarifa_mensual > 0),
  fecha_entrega     DATE,
  -- Calculada por la base de datos: el cliente nunca la envía
  fecha_vencimiento DATE GENERATED ALWAYS AS ((fecha_entrega + INTERVAL '36 months')::date) STORED,
  n_factura         VARCHAR(120),
  estado            VARCHAR(10) NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'vendido', 'robado', 'baja'))
);

CREATE TABLE incidentes (
  id           SERIAL PRIMARY KEY,
  equipo_id    INT NOT NULL REFERENCES equipos(id),
  pieza_id     INT REFERENCES piezas(id),
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('garantia', 'robo')),
  fecha        DATE,
  descripcion  VARCHAR(250),
  estado       VARCHAR(10) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'rechazado')),
  -- Estos tres los calcula el servidor según la cobertura de la marca:
  cubierto     BOOLEAN NOT NULL DEFAULT FALSE,
  costo_eos    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_eos >= 0),
  recuperado   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (recuperado >= 0),   -- deducible cobrado
  perdida_neta NUMERIC(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_incidentes_pieza CHECK (tipo = 'robo' OR pieza_id IS NOT NULL)
);

CREATE TABLE ventas (
  id             SERIAL PRIMARY KEY,
  equipo_id      INT NOT NULL UNIQUE REFERENCES equipos(id),  -- un equipo se vende una sola vez
  empresa_id     INT REFERENCES empresas(id),
  comprador      VARCHAR(120) NOT NULL,
  identificacion VARCHAR(13),                                 -- cédula o RUC (validado en el backend)
  condicion      VARCHAR(10) NOT NULL DEFAULT 'usado' CHECK (condicion IN ('nuevo', 'usado')),
  precio         NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  fecha          DATE
);

CREATE INDEX ix_equipos_modelo   ON equipos(modelo_id);
CREATE INDEX ix_equipos_empresa  ON equipos(empresa_id);
CREATE INDEX ix_incidentes_equipo ON incidentes(equipo_id);

-- =====================================================================
--  Vista: cada equipo con su marca, modelo, tipo y empresa (para listados)
-- =====================================================================
CREATE VIEW v_equipos AS
SELECT e.*, m.nombre AS modelo, m.marca_id, ma.nombre AS marca, m.tipo_id, t.nombre AS tipo,
       em.nombre AS empresa, m.costo_compra
FROM equipos e
JOIN modelos m       ON m.id = e.modelo_id
JOIN marcas ma       ON ma.id = m.marca_id
JOIN tipos_equipo t  ON t.id = m.tipo_id
LEFT JOIN empresas em ON em.id = e.empresa_id;

-- Vistas para los listados del admin (muestran nombres en lugar de ids)
CREATE VIEW v_modelos AS
SELECT m.*, ma.nombre AS marca, t.nombre AS tipo,
       (SELECT COUNT(*) FROM equipos e WHERE e.modelo_id = m.id AND e.estado = 'activo')::int AS equipos_activos
FROM modelos m
JOIN marcas ma      ON ma.id = m.marca_id
JOIN tipos_equipo t ON t.id = m.tipo_id;

CREATE VIEW v_coberturas AS
SELECT c.*, ma.nombre AS marca, p.nombre AS pieza
FROM coberturas c
JOIN marcas ma ON ma.id = c.marca_id
JOIN piezas p  ON p.id = c.pieza_id;

CREATE VIEW v_incidentes AS
SELECT i.*, v.serie, v.modelo_id, v.modelo, v.marca_id, v.marca, v.empresa, p.nombre AS pieza
FROM incidentes i
JOIN v_equipos v   ON v.id = i.equipo_id
LEFT JOIN piezas p ON p.id = i.pieza_id;

CREATE VIEW v_ventas AS
SELECT vt.*, v.serie, v.modelo_id, v.modelo, v.marca_id, v.marca, em.nombre AS empresa
FROM ventas vt
JOIN v_equipos v      ON v.id = vt.equipo_id
LEFT JOIN empresas em ON em.id = vt.empresa_id;

-- =====================================================================
--  CORE: resultado económico de cada equipo a una fecha de corte.
--  Ciclo: se compra -> se renta (~36 meses) -> se vende como usado.
--    ingreso_renta = tarifa mensual x meses rentados (entrega -> fin)
--    fin           = fecha de venta, de robo o la fecha de corte
--    perdidas      = suma de perdida_neta de sus incidentes
--    ganancia      = ingreso_renta + precio_venta - costo_compra - perdidas
-- =====================================================================
CREATE FUNCTION fn_equipos(corte date)
RETURNS TABLE (
  id int, serie varchar, estado varchar, marca_id int, marca varchar, modelo_id int, modelo varchar,
  tipo varchar, empresa_id int, empresa varchar, tarifa numeric, fecha_entrega date,
  fecha_vencimiento date, costo_compra numeric, meses_rentados int, ingreso_renta numeric,
  precio_venta numeric, perdidas numeric, ganancia numeric, situacion text
) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT v.*,
           COALESCE(vt.precio, 0) AS precio_venta,
           COALESCE(i.perdidas, 0) AS perdidas,
           LEAST(corte, COALESCE(vt.fecha, i.fecha_robo, corte)) AS fin,
           vt.id AS venta_id
    FROM v_equipos v
    LEFT JOIN ventas vt ON vt.equipo_id = v.id
    LEFT JOIN (SELECT equipo_id, SUM(perdida_neta) AS perdidas,
                      MIN(fecha) FILTER (WHERE tipo = 'robo') AS fecha_robo
               FROM incidentes GROUP BY equipo_id) i ON i.equipo_id = v.id
  ), meses AS (
    SELECT b.*,
           CASE WHEN b.fecha_entrega IS NULL OR b.fin < b.fecha_entrega THEN 0
                ELSE (EXTRACT(YEAR FROM age(b.fin, b.fecha_entrega)) * 12
                      + EXTRACT(MONTH FROM age(b.fin, b.fecha_entrega)))::int END AS meses_rentados
    FROM base b
  )
  SELECT m.id, m.serie, m.estado, m.marca_id, m.marca, m.modelo_id, m.modelo, m.tipo, m.empresa_id,
         m.empresa, m.tarifa_mensual, m.fecha_entrega, m.fecha_vencimiento, m.costo_compra,
         m.meses_rentados,
         ROUND(COALESCE(m.tarifa_mensual, 0) * m.meses_rentados, 2),
         m.precio_venta, m.perdidas,
         ROUND(COALESCE(m.tarifa_mensual, 0) * m.meses_rentados + m.precio_venta - m.costo_compra - m.perdidas, 2),
         CASE WHEN m.estado <> 'activo' OR m.fecha_vencimiento IS NULL THEN NULL
              WHEN m.fecha_vencimiento <= corte THEN 'vencido'
              WHEN m.fecha_vencimiento <= corte + 90 THEN 'por_vencer'
              ELSE 'vigente' END
  FROM meses m;
$$;
