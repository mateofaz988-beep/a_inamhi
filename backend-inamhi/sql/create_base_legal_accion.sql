-- Tabla para almacenar el catálogo de bases legales por tipo de acción de personal
CREATE TABLE IF NOT EXISTS base_legal_accion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_movimiento VARCHAR(100) NOT NULL,
    base_legal TEXT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tipo_movimiento (tipo_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos iniciales de ejemplo
INSERT INTO base_legal_accion (tipo_movimiento, base_legal) VALUES
('INGRESO', 'Art. 65 de la Ley Orgánica de Servicio Público; Art. 17 del Reglamento General de la LOSEP; Resolución No. MDT-2017-0135'),
('RENUNCIA', 'Art. 47 literal a) de la Ley Orgánica de Servicio Público; Art. 110 del Reglamento General de la LOSEP'),
('TRASLADO ADMINISTRATIVO', 'Art. 35 de la Ley Orgánica de Servicio Público; Art. 71 del Reglamento General de la LOSEP'),
('ASCENSO', 'Art. 67 de la Ley Orgánica de Servicio Público; Art. 87 del Reglamento General de la LOSEP'),
('ENCARGO', 'Art. 54 de la Ley Orgánica de Servicio Público; Art. 84 del Reglamento General de la LOSEP'),
('SUBROGACION', 'Art. 55 de la Ley Orgánica de Servicio Público; Art. 85 del Reglamento General de la LOSEP'),
('CAMBIO ADMINISTRATIVO', 'Art. 35 de la Ley Orgánica de Servicio Público; Art. 70 del Reglamento General de la LOSEP'),
('LICENCIA SIN REMUNERACION', 'Art. 27 de la Ley Orgánica de Servicio Público; Art. 45 del Reglamento General de la LOSEP'),
('VACACIONES', 'Art. 26 de la Ley Orgánica de Servicio Público; Art. 37 del Reglamento General de la LOSEP'),
('LICENCIA POR MATERNIDAD', 'Art. 152 del Código del Trabajo; Art. 43 literal b) de la Ley Orgánica de Servicio Público'),
('LICENCIA POR PATERNIDAD', 'Art. 152 del Código del Trabajo; Art. 43 literal c) de la Ley Orgánica de Servicio Público'),
('SUPRESION DE PUESTO', 'Art. 47 literal j) de la Ley Orgánica de Servicio Público; Art. 113 del Reglamento General de la LOSEP'),
('CESACION DE FUNCIONES', 'Art. 47 de la Ley Orgánica de Servicio Público; Art. 112 del Reglamento General de la LOSEP'),
('NOMBRAMIENTO PROVISIONAL', 'Art. 17 literal b) de la Ley Orgánica de Servicio Público; Art. 19 del Reglamento General de la LOSEP');