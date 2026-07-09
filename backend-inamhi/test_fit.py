import sys
from reportlab.pdfbase.pdfmetrics import stringWidth

def test(nombre):
    alto = 54
    ancho_maximo = 85.05
    max_lineas = 3

    nombre_normalizado = nombre.upper()
    palabras = nombre_normalizado.split()
    tam_inicial = alto * 0.145
    tam_minimo = max(5.4, alto * 0.080)
    tam_actual = tam_inicial

    while tam_actual >= tam_minimo:
        lineas = []
        linea_actual = ""
        for palabra in palabras:
            candidata = palabra if not linea_actual else f"{linea_actual} {palabra}"
            if stringWidth(candidata, "Courier-Bold", tam_actual) <= ancho_maximo:
                linea_actual = candidata
                continue
            if linea_actual:
                lineas.append(linea_actual)
            linea_actual = palabra
        if linea_actual:
            lineas.append(linea_actual)

        cabe_en_ancho = all(stringWidth(linea, "Courier-Bold", tam_actual) <= ancho_maximo for linea in lineas)
        cabe_en_alto = (len(lineas) <= max_lineas and (len(lineas) * tam_actual * 1.10) <= (alto * 0.57))

        if cabe_en_ancho and cabe_en_alto:
            print(f"FITS {nombre}: {lineas} at {tam_actual}")
            return
        
        tam_actual -= 0.5
    print(f"FAILS {nombre}")

test("BRYAN ALEJANDRO CUENCA GUERRERO")
test("CUTI AMAGUANA GINA ELIZABETH")
test("CORNEJO HIDALGO PABLO ANDRES")
test("NOMBRE MUY LARGO QUE SEGURO NO CABE EN EL ESPACIO PORQUE TIENE MUCHAS PALABRAS")
