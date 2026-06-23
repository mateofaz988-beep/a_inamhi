"""
Configuración centralizada del backend.
Carga variables desde .env para evitar credenciales hardcoded.
"""
import os
from dotenv import load_dotenv

# Cargar .env desde la carpeta del backend
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))


# =========================
# 🔌 BASE DE DATOS
# =========================
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'inamhi_rrhh'),
    'port': int(os.getenv('DB_PORT', '3306')),
}

# =========================
# 🚀 FLASK
# =========================
FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')

# =========================
# 📄 LIBREOFFICE
# =========================
LIBREOFFICE_PATH = os.getenv(
    'LIBREOFFICE_PATH',
    r'C:\Program Files\LibreOffice\program\soffice.exe'
)

# =========================
# 📁 ALMACENAMIENTO
# =========================
BASE_STORAGE_DIR = os.path.join(
    os.path.dirname(__file__),
    os.getenv('STORAGE_BASE_DIR', os.path.join('storage', 'documentos'))
)

# =========================
# 🔐 SEGURIDAD
# =========================
MAX_CERTIFICADO_BYTES = int(os.getenv('MAX_CERTIFICADO_MB', '10')) * 1024 * 1024
