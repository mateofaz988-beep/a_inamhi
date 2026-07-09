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
            "x1": 40,
            "y1": 55,
            "x2": 200,
            "y2": 125
        }
    },
    "REVISADO_POR": {
        "orden": 2,
        "obligatoria": True,
        "etiqueta": "Revisado por",
        "posicion": {
            "pagina": 1,
            "x1": 220,
            "y1": 55,
            "x2": 380,
            "y2": 125
        }
    },
    "REGISTRADO_POR": {
        "orden": 3,
        "obligatoria": True,
        "etiqueta": "Registrado por",
        "posicion": {
            "pagina": 1,
            "x1": 400,
            "y1": 55,
            "x2": 560,
            "y2": 125
        }
    },
    "DIRECTOR_TALENTO_HUMANO": {
        "orden": 4,
        "obligatoria": True,
        "etiqueta": "Director(a) de Talento Humano",
        "posicion": {
            "pagina": 0,
            "x1": 50,
            "y1": 35,
            "x2": 210,
            "y2": 105
        }
    },
    "AUTORIDAD_NOMINADORA": {
        "orden": 5,
        "obligatoria": True,
        "etiqueta": "Autoridad Nominadora",
        "posicion": {
            "pagina": 0,
            "x1": 340,
            "y1": 35,
            "x2": 500,
            "y2": 105
        }
    },
    "ACEPTACION_SERVIDOR": {
        "orden": 6,
        "obligatoria": True,
        "etiqueta": "Aceptación del servidor",
        "posicion": {
            "pagina": 0,
            "x1": 300,
            "y1": 115,
            "x2": 460,
            "y2": 185
        }
    }
}
