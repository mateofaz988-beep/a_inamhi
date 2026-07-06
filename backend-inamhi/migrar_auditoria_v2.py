"""Migración idempotente de la tabla auditoria para el módulo en tiempo real."""
from __future__ import annotations

import sys
from typing import Iterable

import mysql.connector

from config import DB_CONFIG


def columnas(cursor) -> dict[str, str]:
    cursor.execute("SHOW COLUMNS FROM auditoria")
    return {fila[0]: str(fila[1]) for fila in cursor.fetchall()}


def indices(cursor) -> set[str]:
    cursor.execute("SHOW INDEX FROM auditoria")
    return {str(fila[2]) for fila in cursor.fetchall()}


def ejecutar(cursor, sql: str) -> None:
    print(f"→ {sql}")
    cursor.execute(sql)


def agregar_columnas(cursor, existentes: dict[str, str]) -> None:
    definiciones = {
        "user_agent": "VARCHAR(500) NULL AFTER ip_usuario",
        "endpoint": "VARCHAR(255) NULL AFTER user_agent",
        "metodo_http": "VARCHAR(10) NULL AFTER endpoint",
        "estado": "VARCHAR(20) NOT NULL DEFAULT 'EXITOSO' AFTER metodo_http",
        "codigo_http": "INT NULL AFTER estado",
        "metadata": "LONGTEXT NULL AFTER codigo_http",
    }

    for nombre, definicion in definiciones.items():
        if nombre not in existentes:
            ejecutar(cursor, f"ALTER TABLE auditoria ADD COLUMN {nombre} {definicion}")


def agregar_indices(cursor, existentes: set[str]) -> None:
    definiciones = {
        "idx_auditoria_fecha_id": "(fecha, id)",
        "idx_auditoria_usuario": "(usuario)",
        "idx_auditoria_accion": "(accion)",
        "idx_auditoria_tabla": "(tabla_afectada)",
        "idx_auditoria_registro": "(registro_id)",
        "idx_auditoria_estado": "(estado)",
    }

    for nombre, columnas_indice in definiciones.items():
        if nombre not in existentes:
            ejecutar(
                cursor,
                f"ALTER TABLE auditoria ADD INDEX {nombre} {columnas_indice}",
            )


def main() -> int:
    conexion = mysql.connector.connect(**DB_CONFIG)
    cursor = conexion.cursor()

    try:
        cursor.execute("SHOW TABLES LIKE 'auditoria'")
        if cursor.fetchone() is None:
            ejecutar(
                cursor,
                """
                CREATE TABLE auditoria (
                    id INT NOT NULL AUTO_INCREMENT,
                    usuario VARCHAR(100) NOT NULL,
                    accion VARCHAR(50) NOT NULL,
                    tabla_afectada VARCHAR(100) NOT NULL,
                    registro_id INT NULL,
                    datos_anteriores LONGTEXT NULL,
                    datos_nuevos LONGTEXT NULL,
                    detalle TEXT NULL,
                    ip_usuario VARCHAR(45) NULL,
                    user_agent VARCHAR(500) NULL,
                    endpoint VARCHAR(255) NULL,
                    metodo_http VARCHAR(10) NULL,
                    estado VARCHAR(20) NOT NULL DEFAULT 'EXITOSO',
                    codigo_http INT NULL,
                    metadata LONGTEXT NULL,
                    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """,
            )
        else:
            existentes = columnas(cursor)

            tipo_accion = existentes.get("accion", "").lower()
            if not tipo_accion.startswith("varchar(50)"):
                ejecutar(
                    cursor,
                    "ALTER TABLE auditoria MODIFY COLUMN accion VARCHAR(50) NOT NULL",
                )

            tipo_detalle = existentes.get("detalle", "").lower()
            if not any(tipo_detalle.startswith(tipo) for tipo in ("text", "mediumtext", "longtext")):
                ejecutar(
                    cursor,
                    "ALTER TABLE auditoria MODIFY COLUMN detalle TEXT NULL",
                )

            existentes = columnas(cursor)
            agregar_columnas(cursor, existentes)

        agregar_indices(cursor, indices(cursor))
        conexion.commit()
        print("\n✓ Migración de auditoría completada correctamente.")
        return 0

    except Exception as error:
        conexion.rollback()
        print(f"\n✗ No se pudo migrar la auditoría: {error}", file=sys.stderr)
        return 1
    finally:
        cursor.close()
        conexion.close()


if __name__ == "__main__":
    raise SystemExit(main())
