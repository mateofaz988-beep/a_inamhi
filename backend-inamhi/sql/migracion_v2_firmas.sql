-- ============================================
-- Migración v2: Columnas faltantes y ENUM ampliado
-- Compatible con MySQL 5.7+ / 8.0+
-- ============================================

-- 1. Agregar columna 'bloqueado' a documentos_accion_personal (si no existe)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'documentos_accion_personal'
      AND COLUMN_NAME = 'bloqueado');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE documentos_accion_personal ADD COLUMN bloqueado TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT "Columna bloqueado ya existe" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ampliar ENUM de estado (agregar GENERANDO_DOCUMENTOS, RECHAZADO, ERROR)
ALTER TABLE documentos_accion_personal
  MODIFY COLUMN estado ENUM(
    'BORRADOR','GENERANDO_DOCUMENTOS','PENDIENTE_FIRMAS',
    'FIRMADO_PARCIALMENTE','FIRMADO_COMPLETAMENTE','FINALIZADO',
    'RECHAZADO','ANULADO','ERROR'
  ) DEFAULT 'BORRADOR';

-- 3. Agregar columna 'etiqueta_seccion' a firmas_documento (si no existe)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'firmas_documento'
      AND COLUMN_NAME = 'etiqueta_seccion');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE firmas_documento ADD COLUMN etiqueta_seccion VARCHAR(200) DEFAULT \'\'',
    'SELECT "Columna etiqueta_seccion ya existe" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Agregar columna 'fecha_creacion' a firmas_documento (si no existe)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'firmas_documento'
      AND COLUMN_NAME = 'fecha_creacion');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE firmas_documento ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP',
    'SELECT "Columna fecha_creacion ya existe" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Verificación final
SELECT 'Migración v2 completada exitosamente' AS resultado;
