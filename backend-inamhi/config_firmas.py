"""
Configuración de secciones de firma para las Acciones de Personal.
Centraliza posiciones, orden y etiquetas de cada sección firmable.
"""
import os
from config import BASE_STORAGE_DIR, LIBREOFFICE_PATH  # noqa: F401

# Re-exportar para compatibilidad
BASE_STORAGE_DIR = BASE_STORAGE_DIR

# Secciones de firma requeridas y su orden lógico
SECCIONES_FIRMA = {
    "ELABORADO_POR": {
        "orden": 1,
        "obligatoria": True,
        "etiqueta": "Elaborado por",
        "posicion": {
            "pagina": 1,
            "x1": 45,
            "y1": 548,
            "x2": 205,
            "y2": 618
        }
    },
    "REVISADO_POR": {
        "orden": 2,
        "obligatoria": True,
        "etiqueta": "Revisado por",
        "posicion": {
            "pagina": 1,
            "x1": 225,
            "y1": 548,
            "x2": 395,
            "y2": 618
        }
    },
    "REGISTRADO_POR": {
        "orden": 3,
        "obligatoria": True,
        "etiqueta": "Registrado por",
        "posicion": {
            "pagina": 1,
            "x1": 415,
            "y1": 548,
            "x2": 585,
            "y2": 618
        }
    },
    "DIRECTOR_TALENTO_HUMANO": {
        "orden": 4,
        "obligatoria": True,
        "etiqueta": "Director(a) de Talento Humano",
        "posicion": {
            "pagina": 0,
            "x1": 50,
            "y1": 136,
            "x2": 210,
            "y2": 206
        }
    },
    "AUTORIDAD_NOMINADORA": {
        "orden": 5,
        "obligatoria": True,
        "etiqueta": "Autoridad Nominadora",
        "posicion": {
            "pagina": 0,
            "x1": 325,
            "y1": 136,
            "x2": 500,
            "y2": 206
        }
    },
    "ACEPTACION_SERVIDOR": {
        "orden": 6,
        "obligatoria": True,
        "etiqueta": "Aceptación del servidor",
        "posicion": {
            "pagina": 0,
            "x1": 325,
            "y1": 239,
            "x2": 485,
            "y2": 309
        }
    }
}
