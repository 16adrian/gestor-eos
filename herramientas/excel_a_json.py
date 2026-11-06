"""
Convierte la copia del Excel de EOS (EOS_TECH_COMPANY - copia.xlsm) en
server/db/datos-excel.json, que es lo que carga `npm run seed`.

Solo hace falta correrlo si el Excel cambia (el JSON ya viene en el repo):
    pip install openpyxl
    python herramientas/excel_a_json.py "ruta/al/EOS_TECH_COMPANY - copia.xlsm"

Qué hace:
- Lee las 21 hojas INV_ ubicando columnas por NOMBRE (cada hoja tiene un orden distinto).
- Normaliza marcas ("LenLovo" -> Lenovo, "CHUWY" -> Chuwi) y tipos ("LAPTOP" -> Laptop).
- Corrige la marca cuando el modelo dice otra cosa (ej. marca LENOVO con modelo "HP ProBook").
- Rechaza series duplicadas y lo informa.
- Lee VENDIDO_2025, GARANTIAS y SINIESTRADOS.
- NO copia nombres de personas (usuarios, compradores): se anonimizan.
"""
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "server" / "db" / "datos-excel.json"

MARCAS = {"LENOVO": "Lenovo", "LENLOVO": "Lenovo", "HP": "HP", "CHUWY": "Chuwi", "CHUWI": "Chuwi",
          "ASUS": "ASUS", "INTEL": "Intel", "SAMSUNG": "Samsung", "EPSON": "Epson",
          "GENÉRICA": "Genérica", "GENERICA": "Genérica", "ENV": "ENV"}
TIPOS = {"LAPTOP": "Laptop", "PROBOOK": "Laptop", "DESKTOP": "Desktop", "PC": "Desktop",
         "PC ESCRITORIO": "Desktop", "CPU": "Desktop", "MINI PC": "Desktop", "ALL IN ONE": "Desktop",
         "TABLET": "Tablet", "MONITOR": "Monitor", "IMPRESORA": "Impresora"}


def texto(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def fecha(v):
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", texto(v))
    if m:
        return date(int(m[3]), int(m[2]), int(m[1])).isoformat()
    return None


def numero(v):
    try:
        n = float(v)
        return round(n, 2) if n > 0 else None
    except (TypeError, ValueError):
        return None


def nombre_modelo(m):
    m = texto(m)
    m = re.sub(r"^Desktop\s+", "", m, flags=re.I)
    m = re.sub(r"\s*-\s*", " - ", m)
    m = re.sub(r"\bGEN(\d)", r"Gen\1", m)
    if m.upper().startswith("THINKPAD"):
        m = "Lenovo " + m
    return m


def marca_de(marca, modelo):
    """La marca escrita a mano a veces está mal: manda el nombre del modelo."""
    up = modelo.upper()
    if "LENOVO" in up or "THINKPAD" in up or "THINKCENTRE" in up:
        return "Lenovo"
    if up.startswith("HP") or " HP " in f" {up} " or "PROBOOK" in up or "PRODESK" in up or "LASERJET" in up:
        return "HP"
    if "CHUWI" in up:
        return "Chuwi"
    return MARCAS.get(texto(marca).upper(), texto(marca).title() or "Sin marca")


def tipo_de(t):
    return TIPOS.get(texto(t).upper(), texto(t).title() or "Laptop")


def costo_estimado(marca, modelo, tipo):
    """Costo de compra por modelo. La empresa aún no entrega los reales:
    se estiman por familia y se marcan como estimados (excepto L16 Gen1)."""
    m = modelo.upper()
    reglas = [
        ("L16 GEN1", 1235), ("L16 GEN2", 1300), ("X1", 2000), ("P16", 2200), ("T16", 1600),
        ("L14", 1050), ("L15", 1050), ("E14 GEN4", 850), ("E14 GEN5", 850), ("E14", 950), ("E15", 750),
        ("E16", 1000), ("V14", 650), ("THINKCENTRE", 700), ("TAB", 250), ("GALAXY", 280),
        ("SAMSUNG", 280), ("HITPAD", 180), ("CORE BOOK", 320), ("PROBOOK 440 G8", 850), ("PROBOOK G8", 850),
        ("PROBOOK", 950), ("PB4", 950), ("PRODESK", 750), ("PRO SFF", 750), ("15S", 550),
        ("LASERJET", 600), ("SMART TANK", 350), ("EPSON", 300), ("GAMING", 1300), ("NUC", 700),
        ("MONITOR", 180), ("ENV", 150), ("CLON", 500),
    ]
    for clave, valor in reglas:
        if clave in m:
            return valor, not (clave == "L16 GEN1")
    return {"Monitor": 180, "Tablet": 250, "Impresora": 400}.get(tipo, 800), True


def columnas(fila):
    return {texto(c).upper(): i for i, c in enumerate(fila) if c is not None}


def col(idx, *nombres):
    for n in nombres:
        for k, i in idx.items():
            if k.startswith(n):
                return i
    return None


def main(ruta_excel):
    wb = openpyxl.load_workbook(ruta_excel, read_only=True, data_only=True)
    reporte = defaultdict(list)
    equipos = {}            # serie -> dict
    modelos = {}            # (marca, modelo) -> tipos Counter
    empresas = set()

    def registrar_modelo(marca, modelo, tipo):
        modelos.setdefault((marca, modelo), Counter())[tipo] += 1

    # ---------- 1) Hojas INV_ (equipos en renta) ----------
    for ws in wb.worksheets:
        if not ws.title.startswith("INV_"):
            continue
        filas = list(ws.iter_rows(values_only=True))
        idx = columnas(filas[0])
        if "SERIE" not in idx:
            continue
        empresa = ws.title[4:].upper()
        c = {k: col(idx, *v) for k, v in {
            "tipo": ["TIPO"], "marca": ["MARCA"], "modelo": ["MODELO"], "serie": ["SERIE"],
            "estado": ["ESTADO"], "tarifa": ["INPSERCOM PRECIO"], "fecha": ["FECHA ENTREGA"],
            "factura": ["N °FACTURA", "N° FACTURA", "FACTURA"]}.items()}
        for fila in filas[1:]:
            serie = texto(fila[c["serie"]]).upper()
            if not serie or texto(fila[c["estado"]]).upper() != "ACTIVO":
                continue
            modelo = nombre_modelo(fila[c["modelo"]])
            marca_original = MARCAS.get(texto(fila[c["marca"]]).upper(), texto(fila[c["marca"]]))
            marca = marca_de(fila[c["marca"]], modelo)
            if marca != marca_original:
                reporte["marca_corregida"].append(f"{serie}: {marca_original} -> {marca} ({modelo})")
            if serie in equipos:
                reporte["serie_duplicada"].append(f"{serie}: en {equipos[serie]['empresa']} y en {empresa} (se conserva la primera)")
                continue
            tipo = tipo_de(fila[c["tipo"]])
            registrar_modelo(marca, modelo, tipo)
            empresas.add(empresa)
            equipos[serie] = {
                "serie": serie, "marca": marca, "modelo": modelo, "empresa": empresa,
                "tarifa_mensual": numero(fila[c["tarifa"]]),
                "fecha_entrega": fecha(fila[c["fecha"]]),
                "n_factura": texto(fila[c["factura"]]) if c["factura"] is not None else None,
                "estado": "activo",
            }
            if not equipos[serie]["tarifa_mensual"]:
                reporte["sin_tarifa"].append(serie)
            if not equipos[serie]["fecha_entrega"]:
                reporte["sin_fecha_entrega"].append(serie)

    def empresa_de(nombre):
        n = re.sub(r"^(INV|BDG)_", "", sin_tildes(texto(nombre).upper()))
        for e in empresas:
            if n.startswith(e[:5]) or e.startswith(n[:5]):
                return e
        empresas.add(n)
        return n

    # ---------- 2) VENDIDO_2025 (ventas) ----------
    ventas = []
    for fila in list(wb["VENDIDO_2025"].iter_rows(values_only=True))[1:]:
        serie = texto(fila[5]).upper()
        if not serie or serie == "SERIE":
            continue
        empresa = empresa_de(fila[1])
        modelo = nombre_modelo(fila[4])
        marca = marca_de(fila[3], modelo)
        if serie in equipos:
            reporte["vendido_pero_activo_en_inv"].append(serie)
        else:
            tipo = tipo_de(fila[2])
            registrar_modelo(marca, modelo, tipo)
            equipos[serie] = {"serie": serie, "marca": marca, "modelo": modelo, "empresa": empresa,
                              "tarifa_mensual": None, "fecha_entrega": None, "n_factura": None}
        equipos[serie]["estado"] = "vendido"
        venta = {"serie": serie, "empresa": empresa, "comprador": f"Colaborador de {empresa}",
                 "condicion": "usado", "precio": numero(fila[9]), "fecha": fecha(fila[10])}
        repetida = next((v for v in ventas if v["serie"] == serie), None)
        if repetida:  # un equipo no se puede vender dos veces: se conserva la venta con fecha
            reporte["venta_duplicada"].append(serie)
            if venta["fecha"]:
                ventas.remove(repetida)
            else:
                continue
        ventas.append(venta)

    # ---------- 3) SINIESTRADOS (robos) ----------
    incidentes = []
    for fila in list(wb["SINIESTRADOS"].iter_rows(values_only=True))[1:]:
        serie = texto(fila[8]).upper()
        if not serie:
            continue
        modelo = nombre_modelo(fila[7])
        marca = marca_de(fila[6], modelo)
        if serie not in equipos:
            tipo = tipo_de(fila[5])
            registrar_modelo(marca, modelo, tipo)
            equipos[serie] = {"serie": serie, "marca": marca, "modelo": modelo, "empresa": empresa_de(fila[2]),
                              "tarifa_mensual": None, "fecha_entrega": None, "n_factura": None}
        equipos[serie]["estado"] = "robado"
        if any(i["serie"] == serie for i in incidentes):
            reporte["robo_registrado_dos_veces"].append(serie)
        reemplazo = texto(fila[12]).upper()
        incidentes.append({
            "serie": serie, "tipo": "robo", "pieza": None, "fecha": fecha(fila[4]), "estado": "cerrado",
            "descripcion": f"Hurto en {texto(fila[1]).title()}" + (f"; reemplazado por {reemplazo}" if reemplazo else ""),
        })

    # ---------- 4) GARANTIAS ----------
    piezas_por_palabra = [
        ("TECLA", "Teclado"), ("CARGADOR", "Cargador"), ("BISEL", "Carcasa"), ("CARCASA", "Carcasa"),
        ("PIN DE CARGA", "Puerto de carga"), ("PANTALLA", "Pantalla"), ("IMAGEN", "Pantalla"),
        ("MONITOR", "Pantalla"), ("VENTILADOR", "Ventilador"), ("TARJETA DE RED", "Tarjeta de red"),
        ("RAM", "Memoria RAM"), ("TOCHPAD", "Touchpad"), ("TOUCHPAD", "Touchpad"),
    ]
    estados = {"ABIERTO": "abierto", "RECHAZADA": "rechazado", "REPARADO": "cerrado", "ENTREGADO": "cerrado"}
    for fila in list(wb["GARANTIAS"].iter_rows(values_only=True))[3:]:
        serie = texto(fila[0]).upper()
        if not serie:
            continue
        if serie not in equipos:
            reporte["garantia_de_equipo_no_registrado"].append(serie)
            marca = MARCAS.get(texto(fila[3]).upper(), "HP")
            modelo = f"Modelo no registrado ({marca})"
            registrar_modelo(marca, modelo, "Monitor" if "MONITOR" in texto(fila[7]).upper() else "Laptop")
            equipos[serie] = {"serie": serie, "marca": marca, "modelo": modelo, "empresa": empresa_de(fila[2]),
                              "tarifa_mensual": None, "fecha_entrega": None, "n_factura": None, "estado": "activo"}
        falla = texto(fila[7])
        encontradas = []
        for palabra, pieza in piezas_por_palabra:
            if palabra in falla.upper() and pieza not in encontradas:
                if palabra == "CARGADOR" and "PIN DE CARGA" in falla.upper():
                    continue
                encontradas.append(pieza)
        estado = next((v for k, v in estados.items() if k in texto(fila[8]).upper()), "abierto")
        # Un caso con dos piezas dañadas = dos registros (uno por pieza)
        for pieza in encontradas or ["Diagnóstico general"]:
            incidentes.append({"serie": serie, "tipo": "garantia", "pieza": pieza, "fecha": fecha(fila[4]),
                               "estado": estado, "descripcion": falla[:200]})

    # ---------- Catálogos ----------
    lista_modelos = []
    for (marca, modelo), tipos in sorted(modelos.items()):
        tipo = tipos.most_common(1)[0][0]
        costo, estimado = costo_estimado(marca, modelo, tipo)
        lista_modelos.append({"marca": marca, "modelo": modelo, "tipo": tipo,
                              "costo_compra": costo, "costo_estimado": estimado})

    datos = {
        "origen": Path(ruta_excel).name,
        "generado": date.today().isoformat(),
        "empresas": sorted(empresas),
        "modelos": lista_modelos,
        "equipos": list(equipos.values()),
        "ventas": ventas,
        "incidentes": incidentes,
        "reporte": {k: v for k, v in reporte.items()},
    }
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")

    estados_eq = Counter(e["estado"] for e in equipos.values())
    print(f"Equipos: {len(equipos)} {dict(estados_eq)}")
    print(f"Ventas: {len(ventas)} (${sum(v['precio'] or 0 for v in ventas):,.0f})  Incidentes: {len(incidentes)} "
          f"{dict(Counter(i['tipo'] for i in incidentes))}")
    print(f"Empresas: {len(empresas)}  Modelos: {len(lista_modelos)}")
    for k, v in reporte.items():
        print(f"  {k}: {len(v)}")
    print(f"-> {SALIDA}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('Uso: python herramientas/excel_a_json.py "EOS_TECH_COMPANY - copia.xlsm"')
    main(sys.argv[1])
