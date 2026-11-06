# Gestor EOS

Sistema web de **gestión comercial y de activos tecnológicos** para **EOS Tech Company (INPSERCOM S.A.)**, empresa que compra equipos (laptops, desktops, tablets, impresoras), los **renta a otras empresas por ~36 meses** y al final los **vende como usados**. Reemplaza un Excel con macros de 53 hojas.

> Proyecto de **Ingeniería Web (ISWZ3101) · UDLA · NRC 5492** — Adrián Morales Quilumba · Docente: Juan José León

| | |
|---|---|
| **Aplicación publicada** | https://TU-APP.onrender.com *(reemplazar)* |
| **Video de la administración** | https://www.loom.com/... *(reemplazar)* |
| **Usuario de prueba** | `admin@eos.com` / `Admin123*` |

---

## 1. ¿Qué hace?

### Core: análisis comparativo de rentabilidad y riesgo
Responde con datos reales del Excel (no con estimaciones) **cuánto gana y cuánto pierde EOS con cada marca y modelo**, y **qué equipos necesitan una decisión** (renovar, vender o dar de baja).

| Pantalla | Pregunta que responde |
|---|---|
| **Comparativa** | ¿HP o Lenovo? ~20 indicadores lado a lado (marca vs marca o modelo vs modelo), mejor celda en verde y peor en rojo, columna de diferencia. Valores absolutos **y por cada 100 equipos** (Lenovo tiene 5 veces más equipos que HP, comparar en bruto engañaría). |
| **Vencimientos** | Matriz **marca × mes** de los equipos que cumplen 36 meses en los próximos 12 meses + los ya vencidos, con el ingreso mensual en riesgo. |
| **Pérdidas** | Matriz **pieza × marca**: qué cubrió la garantía y qué pagó EOS (ej. HP no cubre teclados). Robos por marca y **año contra año** con variación %. |
| **Ranking de modelos** | Ganancia, meses para recuperar la inversión, robos por 100, % vencido, **nivel de riesgo** y **Pareto** de pérdidas. Permite elegir 2-3 modelos y compararlos. |
| **Ficha del equipo** | Ingresos, costo, pérdidas y ganancia de un equipo, con su historial. |

**Drill-down:** cada número es un enlace a la lista de registros que lo forman (ej. "HP: 18 robos" → esos 18 robos → ficha del equipo).

**Fórmulas del core** (en `server/db/schema.sql`, función `fn_equipos`):

```
fecha_vencimiento = fecha_entrega + 36 meses           (columna calculada por PostgreSQL)
ingreso_renta     = tarifa_mensual × meses rentados     (desde la entrega hasta la venta, el robo o la fecha de corte)
ganancia_neta     = ingreso_renta + precio_venta − costo_compra − pérdidas
pérdida garantía  = costo de la pieza si la marca NO la cubre (promedio del rango), 0 si la cubre
pérdida robo      = costo de reposición − deducible cobrado
tasa por 100      = incidentes ÷ equipos activos × 100
```

### Administración MVC (alimenta al core)
CRUD de las 9 tablas con búsqueda, filtros, paginación y eliminación protegida:
empresas, marcas, tipos de equipo, modelos, piezas, coberturas de garantía, equipos, incidentes y ventas. Login de administrador con JWT.

---

## 2. Requisitos de la entrega y dónde se cumplen

| Requisito | Cómo se cumple | Archivo |
|---|---|---|
| **Validación en back-end de un dato sensible** | **RUC** de la empresa (13 dígitos, provincia 01-24/30, tercer dígito, dígito verificador módulo 10/11, establecimiento) y **cédula/RUC del comprador** (módulo 10). Se valida en el servidor **antes de grabar**; el navegador no lo puede saltar. | `server/src/utils/validaciones.js`, `server/src/services/reglas.js` |
| Segunda red de validación | La base de datos tiene `UNIQUE` (RUC, serie), `FOREIGN KEY`, `CHECK` (tarifa > 0, costo mín ≤ máx, estados). | `server/db/schema.sql` |
| Valores calculados en el servidor | `fecha_vencimiento` (columna generada por PostgreSQL) y la **pérdida** de cada incidente (`services/perdidas.js`). Lo que mande el navegador se ignora. | |
| **Relaciones con dropdowns en cascada** | Equipo: **Tipo → Marca → Modelo**. Incidente: **Marca → Modelo → Equipo**. Venta: **Empresa → Equipo**. Nunca se escribe una clave foránea a mano. | `client/src/config/recursos.js`, `client/src/components/CampoSelect.jsx` |
| Versionado en Git + README | Este repositorio. | |
| Deploy | Render (app) + Neon (PostgreSQL). | |

---

## 3. Tecnologías

| Capa MVC | Tecnología |
|---|---|
| **Vista** | React 19 + Vite, React Router, Axios, **SASS** con nombres **BEM**, **CSS Grid**, **Flexbox** y **media queries** |
| **Controlador** | Node.js + Express 5 |
| **Modelo** | PostgreSQL (SQL puro con la librería `pg`) |
| Seguridad | JWT (login), bcrypt (contraseñas), consultas parametrizadas (evitan inyección SQL) |
| Despliegue | Render (Web Service) + Neon (PostgreSQL gratis y persistente) |

---

## 4. Arquitectura MVC

```
Proyecto1/
├── server/                      ← BACKEND (Express)
│   ├── db/
│   │   ├── schema.sql           ← MODELO: tablas, restricciones, vistas y fn_equipos (core)
│   │   ├── seed.js              ← carga los datos del Excel
│   │   └── datos-excel.json     ← datos extraídos del Excel
│   └── src/
│       ├── routes/              ← RUTAS: URL → controlador
│       ├── controllers/         ← CONTROLADORES: reciben la petición y responden JSON
│       ├── services/            ← REGLAS DE NEGOCIO: validaciones y cálculo de pérdidas
│       ├── models/              ← MODELOS: SQL (CRUD genérico + consultas del core)
│       ├── middlewares/         ← login (JWT) y manejo de errores
│       └── utils/               ← validación de RUC / cédula
├── client/                      ← FRONTEND (React) = VISTA
│   └── src/
│       ├── pages/               ← pantallas (core y admin)
│       ├── components/          ← formulario con cascada, layout, tarjetas
│       ├── config/              ← descripción de tablas e indicadores
│       └── styles/              ← SASS (variables, layout, componentes BEM)
├── herramientas/excel_a_json.py ← convierte el Excel en datos-excel.json
└── docs/                        ← colección de Postman
```

Flujo de una petición: **React → `routes` → `controllers` → `services` (valida) → `models` (SQL) → PostgreSQL**.

**Principio DRY:** un solo `Modelo` genérico (`server/src/models/Modelo.js`) y una sola pantalla `Admin.jsx` sirven a las 9 tablas; cada tabla solo se *describe* en pocas líneas.

---

## 5. Base de datos (diagrama entidad-relación)

```mermaid
erDiagram
  MARCAS ||--o{ MODELOS : tiene
  TIPOS_EQUIPO ||--o{ MODELOS : clasifica
  MARCAS ||--o{ COBERTURAS : define
  PIEZAS ||--o{ COBERTURAS : "cubre o no"
  MODELOS ||--o{ EQUIPOS : "es de"
  EMPRESAS ||--o{ EQUIPOS : renta
  EQUIPOS ||--o{ INCIDENTES : sufre
  PIEZAS ||--o{ INCIDENTES : "pieza dañada"
  EQUIPOS ||--o| VENTAS : "se vende"
  EMPRESAS ||--o{ VENTAS : registra

  EMPRESAS {
    int id PK
    string nombre UK
    char ruc UK "validado en backend"
  }
  MODELOS {
    int id PK
    int marca_id FK
    int tipo_id FK
    string nombre
    numeric costo_compra "CHECK > 0"
  }
  COBERTURAS {
    int id PK
    int marca_id FK
    int pieza_id FK
    bool cubre
    numeric costo_min "CHECK min <= max"
    numeric costo_max
  }
  EQUIPOS {
    int id PK
    string serie UK
    int modelo_id FK
    int empresa_id FK
    numeric tarifa_mensual "CHECK > 0"
    date fecha_entrega
    date fecha_vencimiento "GENERATED +36 meses"
    string estado "activo|vendido|robado|baja"
  }
  INCIDENTES {
    int id PK
    int equipo_id FK
    int pieza_id FK
    string tipo "garantia|robo"
    bool cubierto "calculado"
    numeric perdida_neta "calculado"
  }
  VENTAS {
    int id PK
    int equipo_id FK "UNIQUE"
    string identificacion "cedula o RUC"
    numeric precio "CHECK > 0"
  }
```

Además: tabla `usuarios` (login), vistas `v_equipos`, `v_modelos`, `v_incidentes`, `v_ventas`, `v_coberturas` y la función `fn_equipos(corte)`.

---

## 6. Datos precargados (del Excel de la empresa)

`npm run seed` crea las tablas y carga **1.658 equipos** (1.459 activos, 155 vendidos, 44 robados), **156 ventas** ($13.370), **31 registros de garantía** (29 casos) y **46 robos**, 75 modelos y 22 empresas.

El seed **detectó y corrigió problemas reales del Excel** (la base de datos no los acepta):

| Problema | Casos | Qué se hizo |
|---|---|---|
| Serie repetida en dos hojas INV_ | 4 | Se conserva la primera (`UNIQUE serie`) |
| Equipo vendido que seguía "ACTIVO" en el inventario | 25 | Queda como vendido |
| Equipo vendido dos veces | 1 | Se conserva la venta con fecha (`UNIQUE equipo_id`) |
| Marca mal escrita o equivocada ("LenLovo", "CHUWY", HP marcado como Lenovo) | 6 + normalización | Se corrige por el nombre del modelo |
| Garantía de un equipo que no está en inventario | 8 | Se registra el equipo |

Resultados de referencia (corte 16/10/2026): pérdida por garantías no cubiertas **HP $140 (rango $120–160)** y **Lenovo $270 ($220–320)**; robos por cada 100 equipos **HP 7,5 · Lenovo 2,3 · Chuwi 4,3**; **55 equipos vencen en septiembre 2027**.

> Los costos de compra de los modelos son **estimados** (marcados así en la tabla) hasta que la empresa entregue los reales; el único real es Lenovo L16 Gen1 ($1.235). Por eso la ganancia neta de Lenovo aún es negativa: la mayoría de sus equipos se entregaron en 2024-2025 y todavía no recuperan su costo.

---

## 7. Instalación local

Requisitos: **Node.js 20.19 o superior** y **Git**. La base de datos puede ser Neon (recomendado) o PostgreSQL instalado.

```bash
git clone https://github.com/16adrian/gestor-eos.git
cd gestor-eos
npm install                      # instala backend y frontend
copy server\.env.example server\.env   # (Mac/Linux: cp) y pega tu DATABASE_URL
npm run seed                     # crea las tablas y carga el Excel
npm run dev                      # API en :4000 y React en :5173
```

Abrir **http://localhost:5173** y entrar con `admin@eos.com` / `Admin123*`.

### Variables de entorno (`server/.env`)

| Variable | Ejemplo | Para qué |
|---|---|---|
| `DATABASE_URL` | `postgresql://usuario:clave@ep-xxx.neon.tech/neondb?sslmode=require` | Conexión a PostgreSQL |
| `JWT_SECRET` | una frase larga | Firma de los tokens del login |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@eos.com` / `Admin123*` | Usuario que crea el seed |
| `PORT` | `4000` | Puerto del API (Render pone el suyo) |

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Backend + frontend con recarga automática |
| `npm run seed` | **Borra** y vuelve a crear las tablas con los datos del Excel |
| `npm run build` | Compila React para producción (`client/dist`) |
| `npm start` | Arranca el servidor (sirve el API y la página compilada) |

---

## 8. API REST

Todas las rutas (menos `salud` y `login`) requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login → token JWT |
| GET | `/api/core/resumen?corte=` | Indicadores generales |
| GET | `/api/core/comparar?dimension=marca\|modelo&ids=1,2&corte=` | Comparativa lado a lado |
| GET | `/api/core/vencimientos?corte=` | Matriz marca × mes |
| GET | `/api/core/perdidas` | Pérdidas pieza × marca y robos |
| GET | `/api/core/anual` | Año contra año (variación %) |
| GET | `/api/core/ranking?corte=` | Ranking de modelos, riesgo y Pareto |
| GET | `/api/core/equipos/:id` | Ficha económica de un equipo |
| GET | `/api/{tabla}?q=&pagina=&filtros` | Listar (búsqueda, filtros, paginación) |
| GET | `/api/{tabla}/opciones?filtros` | Opciones para dropdowns (cascada) |
| GET / POST / PUT / DELETE | `/api/{tabla}/:id` | Ver, crear, editar, eliminar |
| POST | `/api/equipos/:id/renovar` | Renueva el equipo 36 meses más |

`{tabla}` = `empresas`, `marcas`, `tipos-equipo`, `modelos`, `piezas`, `coberturas`, `equipos`, `incidentes`, `ventas`.

Errores: `{ "mensaje": "Revisa los campos marcados", "campos": { "ruc": "Dígito verificador del RUC de sociedad incorrecto" } }` con código 400 (validación), 401 (sin sesión), 404 o 409 (dato repetido / en uso).

### Probar la validación con Postman
Importar `docs/Gestor-EOS.postman_collection.json`, ejecutar **Login** y luego **"Empresa con RUC INVÁLIDO"** → responde **400** aunque no exista ningún navegador de por medio.

---

## 9. Despliegue

- **Base de datos:** Neon (PostgreSQL gratuito y persistente).
- **Aplicación:** Render Web Service. Build: `npm install --include=dev && npm run build` · Start: `npm start`. Express sirve el API (`/api`) y la página de React compilada desde el mismo servidor.

