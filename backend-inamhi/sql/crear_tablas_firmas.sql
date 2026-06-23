-- Tabla de documentos de acción de personal
CREATE TABLE IF NOT EXISTS documentos_accion_personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_accion VARCHAR(50) NOT NULL,
    cedula_funcionario VARCHAR(20) NOT NULL,
    estado ENUM('BORRADOR','PENDIENTE_FIRMAS','FIRMADO_PARCIALMENTE',
                'FIRMADO_COMPLETAMENTE','FINALIZADO','ANULADO')
           DEFAULT 'BORRADOR',
    ruta_excel VARCHAR(500),
    ruta_pdf_original VARCHAR(500),
    ruta_pdf_actual VARCHAR(500),
    hash_pdf_actual VARCHAR(128),
    version_documento INT DEFAULT 0,
    datos_formulario JSON,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_finalizacion DATETIME NULL,
    usuario_creacion VARCHAR(50),
    UNIQUE KEY uk_numero_accion (numero_accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de firmas por sección
CREATE TABLE IF NOT EXISTS firmas_documento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_id INT NOT NULL,
    seccion VARCHAR(50) NOT NULL,
    orden_firma INT NOT NULL DEFAULT 1,
    cedula_firmante VARCHAR(20),
    nombre_firmante VARCHAR(200) NOT NULL,
    cargo_firmante VARCHAR(200),
    obligatoria TINYINT(1) DEFAULT 1,
    estado ENUM('PENDIENTE','EN_PROCESO','FIRMADA','RECHAZADA') DEFAULT 'PENDIENTE',
    fecha_firma DATETIME NULL,
    serial_certificado VARCHAR(100),
    emisor_certificado VARCHAR(300),
    inicio_vigencia DATETIME NULL,
    fin_vigencia DATETIME NULL,
    hash_documento_firmado VARCHAR(128),
    ruta_version_firmada VARCHAR(500),
    observacion TEXT,
    FOREIGN KEY (documento_id) REFERENCES documentos_accion_personal(id),
    UNIQUE KEY uk_doc_seccion (documento_id, seccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
