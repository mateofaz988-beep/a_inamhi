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
            "pagina": 3,
            "x1": 50,
            "y1": 55,
            "x2": 250,
            "y2": 130
        }
    },
    "REVISADO_POR": {
        "orden": 2,
        "obligatoria": True,
        "etiqueta": "Revisado por",
        "posicion": {
            "pagina": 3,
            "x1": 300,
            "y1": 55,
            "x2": 500,
            "y2": 130
        }
    },
    "REGISTRADO_POR": {
        "orden": 3,
        "obligatoria": True,
        "etiqueta": "Registrado por",
        "posicion": {
            "pagina": 3,
            "x1": 550,
            "y1": 55,
            "x2": 750,
            "y2": 130
        }
    },
    "DIRECTOR_TALENTO_HUMANO": {
        "orden": 4,
        "obligatoria": True,
        "etiqueta": "Director(a) de Talento Humano",
        "posicion": {
            "pagina": 2,
            "x1": 100,
            "y1": 200,
            "x2": 350,
            "y2": 280
        }
    },
    "AUTORIDAD_NOMINADORA": {
        "orden": 5,
        "obligatoria": True,
        "etiqueta": "Autoridad Nominadora",
        "posicion": {
            "pagina": 2,
            "x1": 450,
            "y1": 200,
            "x2": 700,
            "y2": 280
        }
    },
    "ACEPTACION_SERVIDOR": {
        "orden": 6,
        "obligatoria": True,
        "etiqueta": "Aceptación del servidor",
        "posicion": {
            "pagina": 3,
            "x1": 100,
            "y1": 350,
            "x2": 350,
            "y2": 430
        }
    }
}
