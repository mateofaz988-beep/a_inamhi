# Configuración de Coordenadas de Firmas en PDF

El sistema de firmas electrónicas incrusta firmas visuales (sellos) en ubicaciones específicas del documento PDF. Dado que la plantilla Excel puede variar en el futuro, las coordenadas de cada firma no están programadas estáticamente en el código, sino que se configuran en el archivo `config_firmas.py`.

## Estructura de `config_firmas.py`

En `config_firmas.py` encontrará un diccionario llamado `SECCIONES_FIRMA`. Cada entrada representa una sección firmable (Ej: `ELABORADO_POR`) y define:

- `orden`: El orden lógico sugerido.
- `obligatoria`: Si es `True`, el documento no se podrá "Finalizar" sin esta firma.
- `posicion`: Define la página y el cuadro delimitador (`box`) donde aparecerá la firma.

### Entendiendo las coordenadas (x1, y1, x2, y2)

La biblioteca `pyHanko` utiliza un sistema de coordenadas donde:

- El **origen (0,0)** se encuentra en la **esquina inferior izquierda** de la página.
- El eje **X** crece hacia la **derecha**.
- El eje **Y** crece hacia **arriba**.
- La unidad de medida es en puntos (1 punto = 1/72 pulgadas).

`x1` y `y1`: Esquina inferior izquierda del rectángulo de la firma.
`x2` y `y2`: Esquina superior derecha del rectángulo de la firma.

### Ejemplo

```python
"ELABORADO_POR": {
    "orden": 1,
    "obligatoria": True,
    "posicion": {
        "pagina": 3,   # Página del PDF donde va la firma (1-indexada)
        "x1": 50,      # Borde izquierdo (50 puntos desde el lado izquierdo)
        "y1": 55,      # Borde inferior (55 puntos desde la parte inferior)
        "x2": 250,     # Borde derecho (ancho de 200 puntos: 250 - 50)
        "y2": 130      # Borde superior (alto de 75 puntos: 130 - 55)
    }
}
```

## ¿Cómo calibrar las posiciones exactas?

Dado que se ha implementado un PDF provisional (reportlab) si LibreOffice no está instalado, las firmas se insertarán, pero si en el futuro se configura LibreOffice, los recuadros de firma deberán coincidir con las celdas del Excel convertido a PDF.

Para calibrar:

1. Genere un documento y descárguelo en formato PDF (sin firmar o parcialmente firmado).
2. Abra el PDF en un visor avanzado (como Adobe Acrobat Pro o Foxit PDF Editor).
3. Utilice la herramienta de "Medición" o "Reglas" configurando las unidades a **puntos (pt)**.
4. Mida la distancia desde la **esquina inferior izquierda** de la página hasta el cuadro donde debe ir la firma.
5. Edite `config_firmas.py`, reinicie el backend de Flask y pruebe firmar nuevamente en un nuevo documento de prueba.
