"""
Servicio de documentos de acciones de personal.
Gestiona borradores, firmas, versiones y estado de los documentos.
"""
import json
import os
from datetime import datetime, timezone, timedelta
import mysql.connector

# Importar configuración centralizada
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import DB_CONFIG


class DocumentoService:
    """Servicio de acceso a datos para documentos de acciones de personal."""

    @staticmethod
    def get_db_connection():
        """Obtiene una conexión a MySQL usando la configuración centralizada."""
        conexion = mysql.connector.connect(**DB_CONFIG)
        cursor = conexion.cursor()
        cursor.execute("SET time_zone = '-05:00'")
        cursor.close()
        return conexion

    @staticmethod
    def guardar_borrador(numero_accion, cedula, datos_formulario, usuario):
        """
        Guarda o actualiza un borrador de acción de personal.

        Returns:
            (bool, int|None, str|None) — (éxito, doc_id, error)
        """
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor()
        try:
            # Verificar si ya existe
            cursor.execute(
                "SELECT id, estado FROM documentos_accion_personal WHERE numero_accion = %s",
                (numero_accion,)
            )
            row = cursor.fetchone()

            datos_json = json.dumps(datos_formulario, ensure_ascii=False, default=str)

            if row:
                doc_id = row[0]
                estado = row[1]

                if estado != 'BORRADOR':
                    return False, doc_id, f'El documento ya no está en borrador (estado: {estado})'

                cursor.execute("""
                    UPDATE documentos_accion_personal
                    SET datos_formulario = %s,
                        cedula_funcionario = %s
                    WHERE id = %s AND estado = 'BORRADOR'
                """, (datos_json, cedula, doc_id))
            else:
                cursor.execute("""
                    INSERT INTO documentos_accion_personal
                    (numero_accion, cedula_funcionario, estado, datos_formulario, usuario_creacion)
                    VALUES (%s, %s, 'BORRADOR', %s, %s)
                """, (numero_accion, cedula, datos_json, usuario))
                doc_id = cursor.lastrowid

            conn.commit()
            return True, doc_id, None

        except Exception as e:
            conn.rollback()
            return False, None, str(e)
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def obtener_documento(doc_id):
        """Obtiene un documento por su ID."""
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM documentos_accion_personal WHERE id = %s",
                (doc_id,)
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def obtener_firmas_documento(doc_id):
        """Obtiene todas las firmas de un documento, ordenadas por su orden."""
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT id, documento_id, seccion, etiqueta_seccion, orden_firma,
                       cedula_firmante, nombre_firmante, cargo_firmante,
                       obligatoria, estado, fecha_firma,
                       serial_certificado, emisor_certificado,
                       inicio_vigencia, fin_vigencia,
                       hash_documento_antes, hash_documento_despues,
                       ruta_version_firmada, observacion
                FROM firmas_documento
                WHERE documento_id = %s
                ORDER BY orden_firma ASC
            """, (doc_id,))
            firmas = cursor.fetchall()

            # Serializar fechas
            for f in firmas:
                for campo in ('fecha_firma', 'inicio_vigencia', 'fin_vigencia'):
                    if isinstance(f.get(campo), datetime):
                        f[campo] = f[campo].strftime('%Y-%m-%d %H:%M:%S')

            return firmas
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def actualizar_estado_documento(doc_id, estado, ruta_excel=None,
                                     ruta_pdf_original=None, ruta_pdf_actual=None,
                                     hash_pdf=None, bloqueado=None):
        """Actualiza el estado y rutas de un documento."""
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor()
        try:
            campos = ["estado = %s"]
            valores = [estado]

            if ruta_excel is not None:
                campos.append("ruta_excel = %s")
                valores.append(ruta_excel)
            if ruta_pdf_original is not None:
                campos.append("ruta_pdf_original = %s")
                valores.append(ruta_pdf_original)
            if ruta_pdf_actual is not None:
                campos.append("ruta_pdf_actual = %s")
                valores.append(ruta_pdf_actual)
            if hash_pdf is not None:
                campos.append("hash_pdf_actual = %s")
                valores.append(hash_pdf)
            if bloqueado is not None:
                campos.append("bloqueado = %s")
                valores.append(1 if bloqueado else 0)

            valores.append(doc_id)

            cursor.execute(
                f"UPDATE documentos_accion_personal SET {', '.join(campos)} WHERE id = %s",
                tuple(valores)
            )
            conn.commit()
            return True, None
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def crear_firmas_pendientes(doc_id, secciones_config, datos_formulario):
        """
        Crea los registros de firma pendiente para un documento.
        Elimina firmas anteriores si existían.
        """
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor()
        try:
            # Eliminar firmas anteriores (si se vuelve a preparar)
            cursor.execute(
                "DELETE FROM firmas_documento WHERE documento_id = %s",
                (doc_id,)
            )

            etiquetas = {
                'ELABORADO_POR': 'Elaborado por',
                'REVISADO_POR': 'Revisado por',
                'REGISTRADO_POR': 'Registrado por',
                'DIRECTOR_TALENTO_HUMANO': 'Director(a) de Talento Humano',
                'AUTORIDAD_NOMINADORA': 'Autoridad Nominadora',
                'ACEPTACION_SERVIDOR': 'Aceptación del servidor',
            }

            # Mapa de sección → campo del formulario
            mapa_firmantes = {
                'ELABORADO_POR': ('elaborado_por', 'puesto_elaborado'),
                'REVISADO_POR': ('revisado_por', 'puesto_revisado'),
                'REGISTRADO_POR': ('registrado_por', 'puesto_registrado'),
                'DIRECTOR_TALENTO_HUMANO': ('nombre_director_th', 'puesto_director_th'),
                'AUTORIDAD_NOMINADORA': ('nombre_autoridad', 'puesto_autoridad'),
                'ACEPTACION_SERVIDOR': (None, None),  # Especial
            }

            for seccion, conf in secciones_config.items():
                nombre_firmante = 'Por asignar'
                cargo_firmante = ''
                etiqueta = etiquetas.get(seccion, seccion)

                if seccion == 'ACEPTACION_SERVIDOR':
                    apellidos = datos_formulario.get('apellidos', '')
                    nombres = datos_formulario.get('nombres', '')
                    nombre_firmante = f"{apellidos} {nombres}".strip() or 'Servidor'
                    cargo_firmante = datos_formulario.get('denominacion_propuesta', '') or datos_formulario.get('cargo', '')
                elif seccion in mapa_firmantes:
                    campo_nombre, campo_cargo = mapa_firmantes[seccion]
                    if campo_nombre:
                        nombre_firmante = datos_formulario.get(campo_nombre, '') or 'Por asignar'
                    if campo_cargo:
                        cargo_firmante = datos_formulario.get(campo_cargo, '')

                cursor.execute("""
                    INSERT INTO firmas_documento
                    (documento_id, seccion, etiqueta_seccion, orden_firma,
                     nombre_firmante, cargo_firmante, obligatoria, estado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'PENDIENTE')
                """, (
                    doc_id, seccion, etiqueta,
                    conf['orden'],
                    nombre_firmante, cargo_firmante,
                    1 if conf['obligatoria'] else 0
                ))

            conn.commit()
            return True, None
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def registrar_firma(doc_id, seccion, cert_info, hash_antes, hash_despues,
                        pdf_ruta, version):
        """
        Registra una firma completada en la base de datos.
        Usa SELECT FOR UPDATE para control de concurrencia.
        """
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # Bloquear fila del documento
            cursor.execute(
                "SELECT id, estado FROM documentos_accion_personal WHERE id = %s FOR UPDATE",
                (doc_id,)
            )
            doc = cursor.fetchone()
            if not doc:
                return False, None, 'Documento no encontrado'

            if doc['estado'] not in ('PENDIENTE_FIRMAS', 'FIRMADO_PARCIALMENTE'):
                return False, None, f"Estado del documento no permite firmas: {doc['estado']}"

            # Bloquear fila de la firma
            cursor.execute(
                "SELECT id, estado FROM firmas_documento WHERE documento_id = %s AND seccion = %s FOR UPDATE",
                (doc_id, seccion)
            )
            firma = cursor.fetchone()
            if not firma:
                return False, None, 'Sección de firma no encontrada'

            if firma['estado'] == 'FIRMADA':
                return False, None, 'Esta sección ya fue firmada'

            ahora = datetime.now(timezone(timedelta(hours=-5)))
            ahora_naive = ahora.replace(tzinfo=None)

            # Quitar tzinfo para MySQL
            inicio = cert_info['inicio_vigencia']
            fin = cert_info['fin_vigencia']
            if hasattr(inicio, 'replace'):
                inicio = inicio.replace(tzinfo=None)
            if hasattr(fin, 'replace'):
                fin = fin.replace(tzinfo=None)

            # Actualizar la firma
            cursor.execute("""
                UPDATE firmas_documento
                SET estado = 'FIRMADA',
                    fecha_firma = %s,
                    serial_certificado = %s,
                    emisor_certificado = %s,
                    inicio_vigencia = %s,
                    fin_vigencia = %s,
                    hash_documento_antes = %s,
                    hash_documento_despues = %s,
                    ruta_version_firmada = %s
                WHERE id = %s
            """, (
                ahora_naive,
                cert_info.get('serial', ''),
                cert_info.get('emisor', ''),
                inicio, fin,
                hash_antes, hash_despues,
                pdf_ruta,
                firma['id']
            ))

            # Actualizar el documento
            cursor.execute("""
                UPDATE documentos_accion_personal
                SET ruta_pdf_actual = %s,
                    hash_pdf_actual = %s,
                    version_documento = %s,
                    estado = 'FIRMADO_PARCIALMENTE'
                WHERE id = %s
            """, (pdf_ruta, hash_despues, version, doc_id))

            # Registrar versión
            cursor.execute("""
                INSERT INTO versiones_documento
                (documento_id, numero_version, tipo_version, ruta_archivo,
                 hash_archivo, firma_id)
                VALUES (%s, %s, 'FIRMA', %s, %s, %s)
            """, (doc_id, version, pdf_ruta, hash_despues, firma['id']))

            conn.commit()
            return True, firma['id'], None

        except Exception as e:
            conn.rollback()
            import traceback
            traceback.print_exc()
            return False, None, str(e)
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def verificar_y_finalizar(doc_id):
        """
        Verifica si todas las firmas obligatorias están completadas.
        Si es así, cambia el estado a FIRMADO_COMPLETAMENTE.

        Returns:
            (bool, str|None) — (éxito, error)
        """
        conn = DocumentoService.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, estado FROM documentos_accion_personal WHERE id = %s FOR UPDATE",
                (doc_id,)
            )
            doc = cursor.fetchone()
            if not doc:
                return False, 'Documento no encontrado'

            if doc['estado'] not in ('FIRMADO_PARCIALMENTE', 'PENDIENTE_FIRMAS'):
                return False, f"El documento no está en estado firmable: {doc['estado']}"

            cursor.execute("""
                SELECT COUNT(*) as pendientes
                FROM firmas_documento
                WHERE documento_id = %s AND obligatoria = 1 AND estado != 'FIRMADA'
            """, (doc_id,))
            row = cursor.fetchone()

            if row['pendientes'] > 0:
                return False, f"Aún faltan {row['pendientes']} firma(s) obligatoria(s)"

            ahora = datetime.now(timezone(timedelta(hours=-5))).replace(tzinfo=None)

            cursor.execute("""
                UPDATE documentos_accion_personal
                SET estado = 'FIRMADO_COMPLETAMENTE',
                    fecha_finalizacion = %s
                WHERE id = %s
            """, (ahora, doc_id))

            conn.commit()
            return True, None

        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            cursor.close()
            conn.close()
