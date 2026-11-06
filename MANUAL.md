# Manual paso a paso · Gestor EOS

Este manual te lleva desde cero hasta tener el proyecto **funcionando en tu PC, subido a GitHub y publicado en internet (Render)**. Síguelo en orden, sin saltarte pasos. Cada paso dice **qué hacer**, **dónde hacer clic** y **qué deberías ver**.

> 💡 Para leer este manual bonito dentro de Visual Studio Code: abre `MANUAL.md` y presiona **Ctrl + Shift + V**.

**Índice**

0. [Lo que vas a construir (en 1 minuto)](#parte-0)
1. [Instalar los programas](#parte-1)
2. [Crear la base de datos en la nube (Neon)](#parte-2)
3. [Encender el proyecto en tu PC](#parte-3)
4. [Ver la base de datos SQL desde Visual Studio Code](#parte-4)
5. [Subir el código a GitHub](#parte-5)
6. [Publicar la página en internet (Render)](#parte-6)
7. [Probar la validación del backend (la parte que pide el docente)](#parte-7)
8. [Guion del video (Loom o YouTube)](#parte-8)
9. [Cómo defender el proyecto (preguntas y respuestas)](#parte-9)
10. [Si algo sale mal](#parte-10)

---

<a id="parte-0"></a>
## Parte 0 · Lo que vas a construir (en 1 minuto)

Son **tres piezas** que hablan entre sí:

```
  Navegador (React)  ──pide datos──►  Servidor (Express)  ──SQL──►  Base de datos (PostgreSQL en Neon)
   = la VISTA                          = el CONTROLADOR              = el MODELO
```

- En tu PC las tres piezas corren juntas con un solo comando.
- En internet: **Render** guarda y ejecuta el servidor (que también entrega la página de React) y **Neon** guarda la base de datos.
- **La misma base de datos de Neon** la usas en tu PC y en Render. Por eso los datos que cargues en tu PC aparecen también en la página publicada.

Vas a crear **3 cuentas gratis**: GitHub (ya la tienes: `16adrian`), Neon y Render. Para Neon y Render entra **con tu cuenta de GitHub** así no inventas más contraseñas.

---

<a id="parte-1"></a>
## Parte 1 · Instalar los programas

### 1.1 Abrir la terminal de Visual Studio Code
1. Abre **Visual Studio Code**.
2. Menú **File → Open Folder...** (Archivo → Abrir carpeta) y elige:
   `C:\Users\VICTUS PRO\Documents\Uni\7mo\Ing Web\Proyecto1`
   Si pregunta *"Do you trust the authors?"*, haz clic en **Yes, I trust the authors**.
3. Menú **Terminal → New Terminal** (o presiona **Ctrl + ñ** / **Ctrl + `**). Abajo aparece un recuadro negro: esa es **la terminal**. Ahí se escriben los comandos y se presiona **Enter**.

> 🔧 **Muy recomendado:** en la terminal, a la derecha, hay un **+** con una flechita **˅**. Haz clic en la flechita y elige **Command Prompt**. Así evitas un error típico de Windows con PowerShell (ver [Parte 10](#parte-10) si ves "la ejecución de scripts está deshabilitada").

### 1.2 Revisar si ya tienes Node.js y Git
Escribe en la terminal (uno por uno, Enter después de cada uno):

```
node -v
git --version
```

- Si ves algo como `v22.11.0` y `git version 2.47...` → ✅ ya los tienes, salta al paso 1.4.
- Si dice **"no se reconoce como un comando"** → instala lo que falte:

### 1.3 Instalar lo que falte
- **Node.js:** entra a https://nodejs.org → botón verde **LTS** → descarga → doble clic → **Next, Next, Next, Install** (deja todo por defecto).
- **Git:** entra a https://git-scm.com/download/win → se descarga solo → doble clic → **Next** en todo → **Install**.
- **Cierra Visual Studio Code por completo y vuelve a abrirlo** (si no, la terminal no los encuentra). Repite el paso 1.2.

### 1.4 Instalar la extensión de PostgreSQL en Visual Studio Code
1. En la barra izquierda de VS Code haz clic en el ícono de los **cuadritos** (Extensiones) o presiona **Ctrl + Shift + X**.
2. Busca **PostgreSQL**. Elige la que dice **PostgreSQL** de **Microsoft** (ícono de elefante azul).
3. Clic en **Install**. Aparecerá un **elefante** en la barra izquierda. La usarás en la [Parte 4](#parte-4).

---

<a id="parte-2"></a>
## Parte 2 · Crear la base de datos en la nube (Neon)

Neon es PostgreSQL gratis en internet y **no se borra** (la base gratis de Render se borra a los 30 días, por eso usamos Neon).

1. Entra a https://neon.com y haz clic en **Sign up**.
2. Elige **Continue with GitHub** y autoriza.
3. Te pide crear un proyecto:
   - **Project name:** `gestor-eos`
   - **Postgres version:** deja la que viene.
   - **Region:** elige **AWS US East 1 (N. Virginia)** (es la más cercana a Ecuador y a Render).
   - Clic en **Create project**.
4. En el panel del proyecto haz clic en el botón **Connect** (arriba a la derecha).
5. Verás un texto que empieza con `postgresql://`. Activa **Show password** si aparece y haz clic en **Copy snippet** (o selecciona y copia todo el texto).
   Se ve parecido a esto (el tuyo tiene otras letras):
   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
6. **Pégalo en un Bloc de notas** por ahora. Esta es tu **DATABASE_URL**. Es como la llave de tu base de datos: **no la compartas ni la subas a GitHub**.

---

<a id="parte-3"></a>
## Parte 3 · Encender el proyecto en tu PC

Todo esto se hace en la **terminal de VS Code**, con la carpeta `Proyecto1` abierta.

### 3.1 Instalar las librerías del proyecto
```
npm install
```
Tarda 1 a 3 minutos. Al final dice algo como `added 250 packages`. Se crea una carpeta `node_modules` (es normal, no se sube a GitHub).

### 3.2 Crear el archivo de configuración `.env`
```
copy server\.env.example server\.env
```
Ahora en el explorador de VS Code (izquierda) abre **server → .env** y cambia la primera línea pegando tu cadena de Neon:

```
DATABASE_URL=postgresql://neondb_owner:AbC123xyz@ep-cool-name...neon.tech/neondb?sslmode=require&channel_binding=require
```

Cambia también `JWT_SECRET` por cualquier frase larga (ejemplo: `MiProyectoEOSdelaUDLA2026muySecreto`). Guarda con **Ctrl + S**.

> ⚠️ No pongas espacios antes ni después del `=` y no pongas comillas.

### 3.3 Crear las tablas y cargar los datos del Excel
```
npm run seed
```
Deberías ver:
```
1) Creando tablas...
2) Catálogos...
3) Equipos, ventas e incidentes...
4) Usuario administrador...

Listo: { equipos: 1658, activos: 1459, ventas: 156, garantias: 31, robos: 46, modelos: 75, empresas: 22 }
Problemas del Excel detectados y corregidos:
  - serie_duplicada: 4
  ...
Entra con: admin@eos.com / Admin123*
```

> ⚠️ `npm run seed` **borra todo y lo vuelve a crear**. Úsalo solo la primera vez o cuando quieras volver a los datos originales del Excel.

### 3.4 Encender el proyecto
```
npm run dev
```
Verás dos programas encendidos: `[api]` (el servidor, puerto 4000) y `[web]` (React, puerto 5173).

1. Abre el navegador en **http://localhost:5173**
2. Entra con **admin@eos.com** y **Admin123***
3. ¡Listo! Recorre el menú: **Inicio, Comparativa, Vencimientos, Pérdidas, Ranking** (el core) y abajo la **Administración**.

Para **apagarlo**: haz clic en la terminal y presiona **Ctrl + C** (si pregunta, escribe `S` y Enter).
Para **volver a encenderlo** otro día: abre la carpeta en VS Code y escribe `npm run dev`.

---

<a id="parte-4"></a>
## Parte 4 · Ver la base de datos SQL desde Visual Studio Code

1. Haz clic en el **elefante** de la barra izquierda (extensión PostgreSQL).
2. Clic en **+ Add Connection** (o "Nueva conexión").
3. Si hay una pestaña **Connection String**, pega tu DATABASE_URL de Neon. Si no la hay, llena los campos copiando partes de tu cadena:
   - **Server name:** lo que va después de `@` y antes de `/` (ej. `ep-cool-name-123456-pooler.us-east-1.aws.neon.tech`)
   - **User name:** lo que va después de `postgresql://` y antes de `:` (ej. `neondb_owner`)
   - **Password:** lo que va entre `:` y `@`
   - **Database name:** `neondb`
   - **SSL / Encrypt:** `require` (obligatorio)
4. Clic en **Connect** / **Save & Connect**.
5. Despliega: **neondb → Schemas → public → Tables**. Ahí están `empresas`, `equipos`, `incidentes`, `ventas`...
6. Clic derecho sobre el **nombre de una tabla** (la fila con ícono de cuadrícula, ej. `equipos`; **no** sobre la carpeta *Tables* ni sobre una columna) → **Select Top 1000** para ver los datos. Si el panel es bajito y solo ves una tabla, arrastra hacia abajo la línea que lo separa de *Query History*. Si no aparece esa opción, usa el paso 7 con `SELECT * FROM equipos LIMIT 100;`.
7. Para escribir SQL: clic derecho en la conexión → **New Query**. Prueba:
   ```sql
   SELECT marca, COUNT(*) AS activos, SUM(tarifa) AS ingreso_mensual
   FROM fn_equipos(CURRENT_DATE)
   WHERE estado = 'activo'
   GROUP BY marca
   ORDER BY activos DESC;
   ```
   y ejecuta con el botón ▶ (o **Ctrl + Shift + E**).

> El archivo `server/db/schema.sql` tiene todas las tablas, restricciones y la función del core. Ábrelo para explicar la base de datos en el video.

---

<a id="parte-5"></a>
## Parte 5 · Subir el código a GitHub

Tu repositorio ya existe: **https://github.com/16adrian/gestor-eos** (está vacío).

### 5.1 Decirle a Git quién eres (solo la primera vez en esta PC)
```
git config --global user.name "Adrián Morales"
git config --global user.email "adrian.morales.quilumba@udla.edu.ec"
```

### 5.2 Guardar la primera versión
Apaga el proyecto si está encendido (**Ctrl + C**) y escribe uno por uno:

```
git init
git add .
git commit -m "Gestor EOS: core comparativo y administracion MVC"
git branch -M main
git remote add origin https://github.com/16adrian/gestor-eos.git
git push -u origin main
```

- En el `git push` se abre una ventana para **iniciar sesión en GitHub**: elige **Sign in with your browser** → **Authorize**.
- Al final verás `Branch 'main' set up to track...`. Entra a https://github.com/16adrian/gestor-eos y recarga: ya está tu código y el README se ve en la página principal.

> ✅ Revisa que en GitHub **NO aparezca** `server/.env` ni la carpeta `node_modules` (el archivo `.gitignore` los excluye a propósito).

### 5.3 Cada vez que cambies algo
```
git add .
git commit -m "Describe aquí qué cambiaste"
git push
```
Render volverá a publicar la página **solo** cada vez que hagas `git push`.

> 🔒 **Privacidad (opcional):** el archivo `server/db/datos-excel.json` tiene nombres de empresas cliente y series reales de EOS (los nombres de personas ya se quitaron). Si no quieres que sea público: en GitHub → **Settings → General → Danger Zone → Change visibility → Private**, y luego **Settings → Collaborators → Add people** y agrega al docente. Render funciona igual con repositorios privados.

---

<a id="parte-6"></a>
## Parte 6 · Publicar la página en internet (Render)

1. Entra a https://render.com → **Get Started** → **GitHub** y autoriza.
2. En el panel haz clic en **+ New** (arriba) → **Web Service**.
3. En **Git Provider** elige GitHub. Si no aparece tu repositorio, clic en **Configure GitHub** / **Connect account**, elige **Only select repositories → gestor-eos** → **Install**.
4. Selecciona **16adrian / gestor-eos** → **Connect**.
5. Llena así (lo que no se menciona, déjalo como está):

   | Campo | Qué poner |
   |---|---|
   | **Name** | `gestor-eos` (será parte de tu URL) |
   | **Language** | `Node` |
   | **Branch** | `main` |
   | **Region** | `Virginia (US East)` |
   | **Root Directory** | *(vacío)* |
   | **Build Command** | `npm install --include=dev && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | **Free** |

6. Baja a **Environment Variables** → **+ Add Environment Variable** y agrega dos:

   | NAME | VALUE |
   |---|---|
   | `DATABASE_URL` | tu cadena de Neon (la misma del `.env`) |
   | `JWT_SECRET` | la misma frase de tu `.env` |

7. Clic en **Deploy Web Service**.
8. Verás los **Logs** avanzando (3 a 6 minutos). Cuando aparezca **"Your service is live 🎉"**, arriba a la izquierda está tu URL, algo como **https://gestor-eos.onrender.com**. Ábrela y entra con `admin@eos.com` / `Admin123*`.
9. Copia esa URL y pégala en el **README.md** (donde dice `https://TU-APP.onrender.com`), luego haz `git add .`, `git commit -m "URL del deploy"` y `git push`.

> ℹ️ No necesitas correr el seed en Render: **ya cargaste los datos en Neon desde tu PC** (Parte 3.3) y Render usa esa misma base.
>
> 🐢 En el plan gratis, si nadie entra en 15 minutos el servidor se "duerme". La primera visita tarda **~50 segundos** en despertar. **Ábrela un minuto antes** de presentar o grabar.

---

<a id="parte-7"></a>
## Parte 7 · Probar la validación del backend

El docente pide que un **dato sensible** se valide en el **servidor** y no solo en JavaScript. En este proyecto son el **RUC** de la empresa y la **cédula/RUC** del comprador.

### Prueba A: desde la página, quitando la validación del navegador
1. Ve a **Administración → Empresas → + Nuevo empresa**.
2. Nombre: `Empresa Falsa`. RUC: `1790016918001` (tiene 13 números pero el dígito verificador está mal).
3. Marca la casilla **"Quitar validación del navegador (para probar la del servidor)"** y presiona **Guardar**.
4. Resultado: mensaje rojo **"El servidor rechazó los datos"** y debajo del RUC: **"Dígito verificador del RUC de sociedad incorrecto"**. No se grabó nada.
5. Ahora pon un RUC real: `1790016919001` (Corporación Favorita) → **se guarda** ✅.
6. Intenta guardarlo otra vez con otro nombre → **"Ya existe, debe ser único"** (eso lo dice la base de datos con `UNIQUE`).

### Prueba B: "hackeando" el formulario con F12 (lo que dijo el docente)
1. En el formulario de empresa escribe en RUC: `123` → el navegador no deja guardar.
2. Presiona **F12** → pestaña **Elements** → con la flechita selecciona el campo RUC → en el código borra `required` y `pattern="[0-9]{13}"` (doble clic sobre ellos → borrar → Enter).
3. Presiona **Guardar** → el navegador ya no lo detiene, pero **el servidor responde 400: "El RUC debe tener 13 números"**.

### Prueba C: con Postman (sin navegador)
1. Instala Postman (https://www.postman.com/downloads) o usa la extensión **Postman** de VS Code.
2. **Import** → elige el archivo `docs/Gestor-EOS.postman_collection.json`.
3. Si probarás Render: en la colección → **Variables** → cambia `url` por `https://TU-APP.onrender.com/api`.
4. Ejecuta **1. Login** y luego **2. Empresa con RUC INVÁLIDO** → **400** con el motivo. **4.** da **409** (repetido). **6.** da **401** (sin login).

### Dónde está el código de la validación (para mostrarlo)
- `server/src/utils/validaciones.js` → funciones `validarRuc` y `validarCedula` (módulo 10 y 11 del SRI).
- `server/src/services/reglas.js` → en `empresas.validar` se llama a `validarRuc` **antes de grabar**.
- `server/db/schema.sql` → `ruc CHAR(13) UNIQUE` y `CHECK (ruc ~ '^[0-9]{13}$')`: la base de datos es la segunda red.

### Los dropdowns en cascada (requisito 2)
- **Administración → Equipos → + Nuevo equipo:** elige **Tipo de equipo** (ej. Laptop) → el dropdown **Marca** se llena solo con marcas que tienen laptops → al elegir **Marca** (HP) el dropdown **Modelo** muestra solo modelos HP laptop. Si cambias el Tipo, Marca y Modelo se vacían.
- **Incidentes:** Marca → Modelo → Equipo (series de ese modelo) → Pieza. Al elegir la pieza aparece el aviso del servidor: *"HP NO cubre Teclado: la paga EOS. Costo $45 - $60"*.
- **Ventas:** Empresa → Equipo (solo los activos de esa empresa).

---

<a id="parte-8"></a>
## Parte 8 · Guion del video (5 a 8 minutos)

Graba con **Loom** (https://www.loom.com, extensión de Chrome, gratis hasta 5 min por video; si te pasas usa **OBS** o la **Grabadora de Xbox: Win + G** y súbelo a **YouTube como "No listado"**).

Antes de grabar: abre la página de Render 1 minuto antes (para que despierte), abre VS Code con el proyecto y Postman con la colección importada.

| Tiempo | Qué muestras | Qué dices (idea) |
|---|---|---|
| 0:00 – 0:40 | Página de **Inicio** | "EOS renta equipos a empresas por 36 meses y luego los vende. Todo estaba en un Excel de 53 hojas. El core compara cuánto gana y pierde la empresa por marca y modelo." |
| 0:40 – 1:40 | VS Code: carpetas `routes`, `controllers`, `services`, `models` y `schema.sql` | "Es MVC: la ruta recibe la URL, el controlador responde, el servicio valida y el modelo hace el SQL. Un solo modelo genérico sirve a las 9 tablas (DRY)." Muestra el diagrama ER del README en GitHub. |
| 1:40 – 2:20 | Login y listados con datos | "Los datos vienen del Excel real: 1.658 equipos. El seed encontró series duplicadas y equipos vendidos que seguían como activos." Usa buscar y paginar. |
| 2:20 – 3:40 | Crear **empresa**, **modelo** y **equipo** | En el equipo resalta la cascada **Tipo → Marca → Modelo**: "no escribo ninguna clave foránea; cada lista se filtra con la anterior." Muestra que el vencimiento lo calculó la base de datos. |
| 3:40 – 5:20 | **Validación en backend** (Parte 7) | RUC inválido con la casilla marcada → rechazo del servidor. F12 borrando `required` → igual se rechaza. Postman → 400. Muestra `validarRuc` en el código. |
| 5:20 – 6:30 | **Cómo alimenta al core** | Registra un incidente de **Teclado** en una **HP ProBook 440 G8** → el aviso dice que HP no lo cubre → se graba con pérdida $52,50 calculada por el servidor → ve a **Comparativa** y muestra que la pérdida de HP subió. Clic en un número → lista → ficha. |
| 6:30 – 7:00 | GitHub y Render | README, commits y la URL pública funcionando. |

---

<a id="parte-9"></a>
## Parte 9 · Cómo defender el proyecto (preguntas y respuestas)

**¿Dónde está el MVC?**
Modelo = `server/db/schema.sql` + `server/src/models` (SQL). Vista = `client/` (React). Controlador = `server/src/controllers` (con las rutas en `routes/` y las reglas en `services/`).

**¿Por qué el RUC es un dato sensible?**
Identifica a la empresa cliente ante el SRI y es la base de la facturación. Un RUC mal escrito genera facturas inválidas. Por eso se valida con el algoritmo del SRI (provincia, tercer dígito y dígito verificador módulo 10 u 11) en el servidor, y la base de datos además exige que sea único.

**¿Por qué no basta validar en JavaScript?**
Porque el JavaScript corre en el navegador del usuario: se puede desactivar o modificar (F12) o se puede llamar al API directo con Postman. El servidor es el único lugar que el usuario no controla.

**¿Por qué dos validaciones (servicio + base de datos)?**
Defensa en profundidad: el servicio da mensajes claros por campo; la base de datos (`UNIQUE`, `FOREIGN KEY`, `CHECK`) garantiza que ningún dato malo entre aunque alguien escriba directo en la base o haya un error en el código.

**¿Cómo funciona la cascada?**
Cada dropdown pide sus opciones al API filtradas por el anterior: `GET /api/marcas/opciones?tipo_id=1` y luego `GET /api/modelos/opciones?tipo_id=1&marca_id=6`. Además el servidor vuelve a comprobar que el modelo sea de esa marca (alguien podría mandar un id cualquiera).

**¿Por qué "por cada 100 equipos"?**
Lenovo tiene ~1.170 equipos y HP ~240. Lenovo tiene más robos en total (27 vs 18), pero por cada 100 equipos HP tiene **7,5** y Lenovo **2,3**: HP es tres veces más riesgoso. Comparar en bruto engañaría.

**¿Cómo se calcula la pérdida de un incidente?**
`services/perdidas.js`: si la marca cubre la pieza, la pérdida es 0; si no la cubre, es el costo de la pieza (promedio del rango que dio la empresa, ej. teclado HP $45–60 → $52,50); si la garantía fue rechazada, va a pérdida; en un robo, es el costo de reposición menos el deducible. La calcula el servidor y lo que envíe el navegador se ignora.

**¿Qué técnicas de SQL usa el core?**
Una función `fn_equipos(corte)` que calcula ingresos y ganancia de cada equipo; CTE (`WITH`), agregados condicionales (`COUNT(*) FILTER (WHERE ...)`), funciones de ventana (`RANK()` para el ranking, `LAG()` para año contra año, `SUM() OVER` para el Pareto) y `generate_series` para los 12 meses.

**¿Por qué la ganancia de Lenovo sale negativa?**
Porque la mayoría de sus equipos se entregaron en 2024–2025: aún no completan los meses necesarios para pagar su costo (~18–20 meses). Además los costos de compra son estimados hasta que la empresa entregue los reales. El indicador "meses para recuperar" lo muestra.

**¿Qué es la fecha de corte?**
La fecha a la que se calculan los resultados. Con `16/10/2026` se reproducen los valores del análisis del Excel; con la fecha de hoy se ven los actuales.

**¿Qué pasa al eliminar?**
Un equipo no se borra: pasa a estado **baja** y conserva su historial. Un catálogo en uso (ej. una marca con modelos) no se puede borrar: la base de datos lo impide con la clave foránea y el sistema responde "otros registros lo usan".

**¿Cómo se protege el login?**
La contraseña se guarda cifrada con **bcrypt** (nunca en texto). Al entrar, el servidor entrega un **token JWT** que vence en 8 horas y que se envía en cada petición. Sin token el API responde 401.

**¿Dónde aplicaste SASS, BEM, Grid, Flexbox y media queries?**
`client/src/styles/`: variables y un **mixin** de media query (`_variables.scss`); **Grid** en la estructura de la página, las tarjetas y los formularios; **Flexbox** en la cabecera, el menú y las barras; nombres **BEM** como `.tabla__celda--mejor` o `.menu__enlace--activo`; en celular (menos de 768 px) el menú se vuelve horizontal y todo pasa a una columna.

---

<a id="parte-10"></a>
## Parte 10 · Si algo sale mal

| Mensaje o problema | Solución |
|---|---|
| `'npm' no se reconoce como un comando` | Instala Node.js (Parte 1.3) y **cierra y abre VS Code**. |
| `la ejecución de scripts está deshabilitada en este sistema` | Cambia la terminal a **Command Prompt** (flechita ˅ junto al +). O en PowerShell escribe `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responde `S`, y vuelve a intentar. |
| `Falta DATABASE_URL en server/.env` | El archivo `.env` no existe o no está dentro de la carpeta `server`. Repite la Parte 3.2. |
| `password authentication failed` o `getaddrinfo ENOTFOUND` | La DATABASE_URL está mal copiada. Cópiala de nuevo desde Neon → **Connect** (con **Show password**). |
| `Error: listen EADDRINUSE :::4000` | Ya tienes el proyecto encendido en otra terminal. Ciérrala (icono de basurero de la terminal) y vuelve a correr `npm run dev`. |
| La página dice "Correo o contraseña incorrectos" | Escribe exactamente `admin@eos.com` y `Admin123*` (con mayúscula y asterisco). Si sigue, corre `npm run seed`. |
| En `git push`: `rejected ... (fetch first)` | Alguien creó archivos en GitHub. Como tu PC tiene la versión buena: `git push -u origin main --force`. |
| En `git push`: `remote origin already exists` | Ya lo agregaste antes; sigue con `git push -u origin main`. |
| Render: `vite: not found` al construir | El Build Command debe ser exactamente `npm install --include=dev && npm run build`. Corrígelo en **Settings → Build Command** y luego **Manual Deploy → Deploy latest commit**. |
| Render: la página abre pero el login falla | Revisa en Render → **Environment** que `DATABASE_URL` y `JWT_SECRET` estén bien escritas; guarda y espera el nuevo deploy. |
| Render tarda muchísimo en abrir | Es el plan gratis despertando (~50 s). Espera y recarga. |
| Quiero volver a los datos originales del Excel | `npm run seed` (borra lo que hayas creado). |
| Cambió el Excel y quiero recargarlo | Copia el `.xlsm` a la carpeta, instala Python y corre `pip install openpyxl` y luego `python herramientas/excel_a_json.py "EOS_TECH_COMPANY - copia.xlsm"`; después `npm run seed`. |
