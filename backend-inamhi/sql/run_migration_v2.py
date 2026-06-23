"""Ejecutar migración v2 de base de datos."""
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='root',
    database='inamhi_rrhh'
)
cursor = conn.cursor(buffered=True)

queries = [
    # 1. Ampliar ENUM de estado
    """ALTER TABLE documentos_accion_personal
       MODIFY COLUMN estado ENUM(
         'BORRADOR','GENERANDO_DOCUMENTOS','PENDIENTE_FIRMAS',
         'FIRMADO_PARCIALMENTE','FIRMADO_COMPLETAMENTE','FINALIZADO',
         'RECHAZADO','ANULADO','ERROR'
       ) DEFAULT 'BORRADOR'""",
]

# 2. Agregar columna 'bloqueado' si no existe
cursor.execute("""
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'documentos_accion_personal'
      AND COLUMN_NAME = 'bloqueado'
""")
if cursor.fetchone()[0] == 0:
    queries.append(
        "ALTER TABLE documentos_accion_personal ADD COLUMN bloqueado TINYINT(1) NOT NULL DEFAULT 0"
    )
    print("  - Agregando columna 'bloqueado'")
else:
    print("  - Columna 'bloqueado' ya existe")

# 3. Agregar columna 'etiqueta_seccion' si no existe
cursor.execute("""
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'firmas_documento'
      AND COLUMN_NAME = 'etiqueta_seccion'
""")
if cursor.fetchone()[0] == 0:
    queries.append(
        "ALTER TABLE firmas_documento ADD COLUMN etiqueta_seccion VARCHAR(200) DEFAULT ''"
    )
    print("  - Agregando columna 'etiqueta_seccion'")
else:
    print("  - Columna 'etiqueta_seccion' ya existe")

# 4. Agregar 'fecha_creacion' a firmas_documento si no existe
cursor.execute("""
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'firmas_documento'
      AND COLUMN_NAME = 'fecha_creacion'
""")
if cursor.fetchone()[0] == 0:
    queries.append(
        "ALTER TABLE firmas_documento ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP"
    )
    print("  - Agregando columna 'fecha_creacion'")
else:
    print("  - Columna 'fecha_creacion' ya existe")

# Ejecutar
for q in queries:
    print(f"  Ejecutando: {q[:60]}...")
    cursor.execute(q)

conn.commit()
cursor.close()
conn.close()
print("\n✅ Migración v2 completada exitosamente.")
