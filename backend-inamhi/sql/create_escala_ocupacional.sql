-- Tabla para almacenar la escala de remuneración por grupo ocupacional
-- (antes vivía hardcodeada en el frontend, en solicitud-permisos.ts).
CREATE TABLE IF NOT EXISTS escala_ocupacional (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_ocupacional VARCHAR(100) NOT NULL,
    grado VARCHAR(10) NOT NULL,
    remuneracion DECIMAL(10,2) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_grupo_ocupacional (grupo_ocupacional)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales: tabla de Hoja2 de la plantilla institucional.
INSERT INTO escala_ocupacional (grupo_ocupacional, grado, remuneracion) VALUES
('SERVIDOR PUBLICO DE APOYO 1', '3',    585),
('SERVIDOR PUBLICO DE APOYO 2', '4',    622),
('SERVIDOR PUBLICO DE APOYO 3', '5',    675),
('SERVIDOR PUBLICO DE APOYO 4', '6',    733),
('SERVIDOR PUBLICO 1',          '7',    817),
('SERVIDOR PUBLICO 2',          '8',    901),
('SERVIDOR PUBLICO 3',          '9',    986),
('SERVIDOR PUBLICO 4',          '10',  1086),
('SERVIDOR PUBLICO 5',          '11',  1212),
('SERVIDOR PUBLICO 6',          '12',  1412),
('SERVIDOR PUBLICO 7',          '13',  1676),
('NIVEL JERARQUICO SUPERIOR 2', 'NJS2', 2368),
('NIVEL JERARQUICO SUPERIOR 3', 'NJS3', 2418);
