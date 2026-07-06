"""
Servicio de firma electrónica PDF.

Utiliza pyHanko para aplicar firmas digitales criptográficas incrementales.
Cada firma se aplica sobre la última versión del PDF sin invalidar las
firmas anteriores.

La identidad visible se obtiene exclusivamente del certificado PKCS#12.
La apariencia se genera como una página PDF vectorial con el formato:

    [ CÓDIGO QR ]  Firmado electrónicamente por:
                   NOMBRE REAL DEL CERTIFICADO

El nombre configurado en la sección se conserva como referencia funcional,
pero nunca sustituye la identidad criptográfica del titular del certificado.
"""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
import traceback
from io import BytesIO

import qrcode
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
)
from cryptography.x509.oid import NameOID
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.layout import (
    AxisAlignment,
    InnerScaling,
    Margins,
    SimpleBoxLayoutRule,
)
from pyhanko.sign import fields, signers
from pyhanko.sign.signers.pdf_signer import PdfSigner
from pyhanko.stamp import StaticStampStyle
from qrcode.constants import ERROR_CORRECT_H
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


class FirmaService:
    """Servicio para firmar PDFs de forma incremental con PKCS#12."""

    @staticmethod
    def firmar_pdf(
        pdf_path: str,
        output_path: str,
        cert_info: dict,
        seccion: str,
        firmante: str,
        cargo: str,
        posicion: dict,
        pagina: int | None = None,
        url_verificacion: str | None = None,
    ) -> tuple[bool, str | None]:
        """
        Firma un PDF de forma incremental y genera una apariencia visible
        equivalente al modelo institucional con QR y nombre del certificado.

        Args:
            pdf_path: Ruta del PDF que se va a firmar.
            output_path: Ruta donde se guardará la nueva versión firmada.
            cert_info: Datos del certificado entregados por CertificadoService.
            seccion: Sección que se firma, por ejemplo ``ELABORADO_POR``.
            firmante: Responsable esperado de la sección. Solo es informativo.
            cargo: Cargo esperado de la sección. Solo es informativo.
            posicion: Diccionario con ``x1``, ``y1``, ``x2`` y ``y2``.
            pagina: Índice de página basado en cero.
            url_verificacion: URL opcional codificada dentro del QR.

        Returns:
            Tupla ``(éxito, mensaje_error)``.
        """
        pdf_buffer: BytesIO | None = None
        output_buffer: BytesIO | None = None
        apariencia_pdf_path: str | None = None

        try:
            FirmaService._validar_parametros(
                pdf_path=pdf_path,
                output_path=output_path,
                cert_info=cert_info,
                posicion=posicion,
            )

            with open(pdf_path, "rb") as archivo_pdf:
                pdf_data = archivo_pdf.read()

            if not pdf_data:
                raise ValueError("El PDF que se intenta firmar está vacío.")

            # La identidad real se obtiene siempre del certificado X.509.
            identidad = FirmaService.obtener_identidad_certificado(cert_info)
            nombre_certificado = identidad["nombre_titular"]

            # Se actualiza cert_info para que el registro de auditoría conserve
            # la identidad verdadera del certificado usado para firmar.
            cert_info["nombre_titular"] = nombre_certificado
            cert_info["titular_certificado"] = nombre_certificado
            cert_info["cedula_titular"] = identidad.get("identificacion", "")
            cert_info["serial_certificado"] = identidad["serial_certificado"]
            cert_info["huella_sha256"] = identidad["huella_sha256"]
            cert_info["emisor"] = identidad["emisor"]

            pdf_buffer = BytesIO(pdf_data)

            # Los PDF exportados desde Excel pueden contener referencias
            # cruzadas híbridas. El modo no estricto permite procesarlos.
            writer = IncrementalPdfFileWriter(
                pdf_buffer,
                strict=False,
            )

            page_idx = FirmaService._resolver_indice_pagina(
                pagina=pagina,
                posicion=posicion,
            )
            box = FirmaService._resolver_caja_firma(posicion)

            seccion_segura = re.sub(
                r"[^A-Za-z0-9_-]+",
                "_",
                str(seccion or "SECCION").strip(),
            ).strip("_") or "SECCION"
            field_name = f"Firma_{seccion_segura}"

            sig_field = fields.SigFieldSpec(
                sig_field_name=field_name,
                box=box,
                on_page=page_idx,
            )
            fields.append_signature_field(
                writer,
                sig_field_spec=sig_field,
            )

            signer = FirmaService._crear_signer(cert_info)

            hash_documento_previo = hashlib.sha256(pdf_data).hexdigest()
            qr_destino = FirmaService._construir_destino_qr(
                url_verificacion=url_verificacion,
                huella_certificado=identidad["huella_sha256"],
                hash_documento=hash_documento_previo,
                seccion=seccion_segura,
                titular=nombre_certificado,
            )

            # La apariencia se genera como PDF vectorial independiente y se
            # importa nativamente en la firma, sin rasterizar el texto ni el QR.
            apariencia_pdf_path = FirmaService._crear_apariencia_firma_pdf(
                nombre_titular=nombre_certificado,
                contenido_qr=qr_destino,
                box=box,
            )

            estilo_apariencia = StaticStampStyle.from_pdf_file(
                apariencia_pdf_path,
                page_ix=0,
                border_width=0,
                background_opacity=1.0,
                background_layout=SimpleBoxLayoutRule(
                    x_align=AxisAlignment.ALIGN_MIN,
                    y_align=AxisAlignment.ALIGN_MIN,
                    margins=Margins(
                        left=0,
                        right=0,
                        top=0,
                        bottom=0,
                    ),
                    inner_content_scaling=InnerScaling.STRETCH_FILL,
                ),
            )

            metadata = signers.PdfSignatureMetadata(
                field_name=field_name,
                md_algorithm="sha256",
                subfilter=fields.SigSeedSubFilter.PADES,
                reason=f"Firma electrónica de la sección {seccion_segura}",
                location="Ecuador",
            )

            pdf_signer = PdfSigner(
                signature_meta=metadata,
                signer=signer,
                stamp_style=estilo_apariencia,
            )

            output_buffer = BytesIO()
            pdf_signer.sign_pdf(
                writer,
                output=output_buffer,
                in_place=False,
            )

            output_buffer.seek(0)
            pdf_firmado = output_buffer.read()

            if not pdf_firmado:
                raise ValueError("pyHanko no generó contenido para el PDF firmado.")

            directorio_salida = os.path.dirname(os.path.abspath(output_path))
            os.makedirs(directorio_salida, exist_ok=True)

            ruta_temporal = f"{output_path}.tmp"
            try:
                with open(ruta_temporal, "wb") as archivo_salida:
                    archivo_salida.write(pdf_firmado)
                    archivo_salida.flush()
                    os.fsync(archivo_salida.fileno())

                os.replace(ruta_temporal, output_path)
            finally:
                if os.path.exists(ruta_temporal):
                    try:
                        os.remove(ruta_temporal)
                    except OSError:
                        pass

            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise ValueError("El archivo PDF firmado no se guardó correctamente.")

            return True, None

        except Exception as error:
            traceback.print_exc()
            return False, str(error)

        finally:
            if apariencia_pdf_path and os.path.exists(apariencia_pdf_path):
                try:
                    os.remove(apariencia_pdf_path)
                except OSError:
                    pass

            if output_buffer is not None:
                output_buffer.close()
            if pdf_buffer is not None:
                pdf_buffer.close()

    @staticmethod
    def _crear_apariencia_firma_pdf(
        nombre_titular: str,
        contenido_qr: str,
        box: tuple[int, int, int, int],
    ) -> str:
        """
        Crea una apariencia visible compacta dentro del campo de firma.

        El campo PDF conserva las coordenadas configuradas, pero el contenido
        visible se dibuja en un bloque más pequeño para no invadir los campos
        de nombre, puesto ni la columna contigua de la plantilla.

        Variables opcionales en ``.env``:

        - ``FIRMA_ESCALA_VISUAL``: proporción del alto disponible. Por defecto 0.58.
        - ``FIRMA_ANCHO_MAX_PTS``: ancho máximo del sello. Por defecto 180 puntos.
        - ``FIRMA_ALTO_MAX_PTS``: alto máximo del sello. Por defecto 58 puntos.
        - ``FIRMA_ALINEACION_X``: ``izquierda``, ``centro`` o ``derecha``.
        - ``FIRMA_ALINEACION_Y``: ``abajo``, ``centro`` o ``arriba``.
        """
        x1, y1, x2, y2 = box
        ancho_campo = float(x2 - x1)
        alto_campo = float(y2 - y1)

        if ancho_campo <= 0 or alto_campo <= 0:
            raise ValueError("La caja visible de la firma no tiene dimensiones válidas.")

        if ancho_campo < 90 or alto_campo < 30:
            raise ValueError(
                "La caja de firma es demasiado pequeña para mostrar el QR y el nombre. "
                f"Dimensiones recibidas: {ancho_campo:.1f} x {alto_campo:.1f} puntos."
            )

        def leer_float(nombre: str, predeterminado: float, minimo: float, maximo: float) -> float:
            valor = os.getenv(nombre, "").strip()
            try:
                numero = float(valor) if valor else predeterminado
            except ValueError:
                numero = predeterminado
            return max(minimo, min(numero, maximo))

        escala_visual = leer_float("FIRMA_ESCALA_VISUAL", 0.58, 0.30, 0.90)
        ancho_maximo = leer_float("FIRMA_ANCHO_MAX_PTS", 180.0, 100.0, 320.0)
        alto_maximo = leer_float("FIRMA_ALTO_MAX_PTS", 58.0, 35.0, 110.0)

        # La referencia visual tiene una relación aproximada 2.95:1.
        relacion_objetivo = 2.95
        margen_campo = max(2.0, min(ancho_campo, alto_campo) * 0.025)
        ancho_disponible = max(1.0, ancho_campo - (2 * margen_campo))
        alto_disponible = max(1.0, alto_campo - (2 * margen_campo))

        alto_visual = min(alto_disponible * escala_visual, alto_maximo)
        ancho_visual = min(ancho_disponible, ancho_maximo, alto_visual * relacion_objetivo)

        # Si el ancho disponible obliga a reducir el sello, se recalcula el alto
        # para mantener la proporción y evitar deformaciones.
        if ancho_visual < alto_visual * relacion_objetivo:
            alto_visual = ancho_visual / relacion_objetivo

        if ancho_visual < 95 or alto_visual < 32:
            raise ValueError(
                "El área configurada no permite una firma compacta legible. "
                f"Área útil calculada: {ancho_visual:.1f} x {alto_visual:.1f} puntos."
            )

        alineacion_x = os.getenv("FIRMA_ALINEACION_X", "izquierda").strip().lower()
        alineacion_y = os.getenv("FIRMA_ALINEACION_Y", "centro").strip().lower()

        if alineacion_x == "derecha":
            origen_x = ancho_campo - margen_campo - ancho_visual
        elif alineacion_x == "centro":
            origen_x = (ancho_campo - ancho_visual) / 2
        else:
            origen_x = margen_campo

        if alineacion_y == "arriba":
            origen_y = alto_campo - margen_campo - alto_visual
        elif alineacion_y == "abajo":
            origen_y = margen_campo
        else:
            origen_y = (alto_campo - alto_visual) / 2

        archivo_temporal = tempfile.NamedTemporaryFile(
            suffix=".pdf",
            prefix="apariencia_firma_",
            delete=False,
        )
        ruta = archivo_temporal.name
        archivo_temporal.close()

        try:
            # El PDF temporal tiene el mismo tamaño que el campo de firma. Solo
            # se dibuja dentro del subrectángulo compacto, sin pintar un fondo
            # blanco sobre toda la celda de la plantilla.
            lienzo = canvas.Canvas(
                ruta,
                pagesize=(ancho_campo, alto_campo),
                pageCompression=1,
            )
            lienzo.setTitle("Apariencia de firma electrónica")
            lienzo.setAuthor("INAMHI")
            lienzo.setCreator("Sistema de Acciones de Personal")

            margen_interno = max(0.8, alto_visual * 0.015)
            qr_size = alto_visual - (2 * margen_interno)

            FirmaService._dibujar_qr_vectorial(
                lienzo=lienzo,
                contenido=contenido_qr,
                x=origen_x + margen_interno,
                y=origen_y + margen_interno,
                size=qr_size,
            )

            separacion = alto_visual * 0.075
            texto_x = origen_x + margen_interno + qr_size + separacion
            margen_derecho = alto_visual * 0.025
            ancho_texto = (
                origen_x + ancho_visual - margen_derecho - texto_x
            )

            if ancho_texto <= alto_visual * 0.55:
                raise ValueError(
                    "El campo de firma no tiene suficiente ancho para mostrar "
                    "el QR y el nombre en formato horizontal."
                )

            titulo = "Firmado electrónicamente por:"
            tam_titulo = FirmaService._ajustar_fuente_a_ancho(
                texto=titulo,
                fuente="Courier",
                tam_inicial=alto_visual * 0.073,
                tam_minimo=max(4.6, alto_visual * 0.052),
                ancho_maximo=ancho_texto,
            )

            lienzo.setFillColorRGB(0, 0, 0)
            lienzo.setFont("Courier", tam_titulo)
            lienzo.drawString(
                texto_x,
                origen_y + (alto_visual * 0.79),
                titulo,
            )

            lineas_nombre, tam_nombre = FirmaService._distribuir_nombre_visible(
                nombre=nombre_titular,
                ancho_maximo=ancho_texto,
                alto=alto_visual,
                max_lineas=3,
            )

            lienzo.setFont("Courier-Bold", tam_nombre)
            interlineado = tam_nombre * 1.10
            primera_base = origen_y + (alto_visual * 0.58)

            for indice, linea in enumerate(lineas_nombre):
                y_linea = primera_base - (indice * interlineado)
                lienzo.drawString(texto_x, y_linea, linea)

            lienzo.showPage()
            lienzo.save()

            if not os.path.exists(ruta) or os.path.getsize(ruta) == 0:
                raise ValueError("No se pudo generar la apariencia visible de la firma.")

            return ruta

        except Exception:
            if os.path.exists(ruta):
                try:
                    os.remove(ruta)
                except OSError:
                    pass
            raise

    @staticmethod
    def _dibujar_qr_vectorial(
        lienzo: canvas.Canvas,
        contenido: str,
        x: float,
        y: float,
        size: float,
    ) -> None:
        """Dibuja un QR vectorial negro sobre fondo blanco."""
        if not contenido:
            raise ValueError("El contenido del código QR está vacío.")

        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_H,
            box_size=1,
            border=1,
        )
        qr.add_data(contenido)
        qr.make(fit=True)

        matriz = qr.get_matrix()
        total_modulos = len(matriz)
        if total_modulos <= 0:
            raise ValueError("No se pudo construir la matriz del código QR.")

        modulo = size / total_modulos
        lienzo.setFillColorRGB(0, 0, 0)

        # Agrupar módulos negros consecutivos reduce el tamaño del PDF.
        for fila, valores in enumerate(matriz):
            y_modulo = y + size - ((fila + 1) * modulo)
            inicio_negro: int | None = None

            for columna, negro in enumerate(list(valores) + [False]):
                if negro and inicio_negro is None:
                    inicio_negro = columna
                    continue

                if not negro and inicio_negro is not None:
                    cantidad = columna - inicio_negro
                    lienzo.rect(
                        x + (inicio_negro * modulo),
                        y_modulo,
                        cantidad * modulo,
                        modulo,
                        stroke=0,
                        fill=1,
                    )
                    inicio_negro = None

    @staticmethod
    def _distribuir_nombre_visible(
        nombre: str,
        ancho_maximo: float,
        alto: float,
        max_lineas: int = 3,
    ) -> tuple[list[str], float]:
        """Divide el nombre en líneas y ajusta el tamaño sin cortar palabras."""
        nombre_normalizado = FirmaService._normalizar_nombre(nombre)
        palabras = nombre_normalizado.split()

        if not palabras:
            raise ValueError("El certificado no contiene un nombre visible.")

        tam_inicial = alto * 0.145
        tam_minimo = max(5.4, alto * 0.080)
        tam_actual = tam_inicial

        while tam_actual >= tam_minimo:
            lineas: list[str] = []
            linea_actual = ""

            for palabra in palabras:
                candidata = palabra if not linea_actual else f"{linea_actual} {palabra}"

                if stringWidth(
                    candidata,
                    "Courier-Bold",
                    tam_actual,
                ) <= ancho_maximo:
                    linea_actual = candidata
                    continue

                if linea_actual:
                    lineas.append(linea_actual)
                linea_actual = palabra

            if linea_actual:
                lineas.append(linea_actual)

            cabe_en_ancho = all(
                stringWidth(linea, "Courier-Bold", tam_actual) <= ancho_maximo
                for linea in lineas
            )
            cabe_en_alto = (
                len(lineas) <= max_lineas
                and (len(lineas) * tam_actual * 1.10) <= (alto * 0.57)
            )

            if cabe_en_ancho and cabe_en_alto:
                return lineas, tam_actual

            tam_actual -= 0.5

        raise ValueError(
            "El nombre del certificado no cabe en el área de firma configurada. "
            "Amplíe la caja de firma en config_firmas.py."
        )

    @staticmethod
    def _ajustar_fuente_a_ancho(
        texto: str,
        fuente: str,
        tam_inicial: float,
        tam_minimo: float,
        ancho_maximo: float,
    ) -> float:
        """Reduce el tamaño de fuente hasta que el texto quepa en una línea."""
        tam = tam_inicial
        while tam >= tam_minimo:
            if stringWidth(texto, fuente, tam) <= ancho_maximo:
                return tam
            tam -= 0.25

        return tam_minimo

    @staticmethod
    def obtener_identidad_certificado(cert_info: dict) -> dict:
        """
        Extrae la identidad del titular directamente del certificado X.509.

        Prioridad del nombre:
        1. GIVEN_NAME + SURNAME.
        2. COMMON_NAME.
        3. Subject completo RFC 4514.
        """
        certificado = cert_info.get("_certificate")
        if certificado is None:
            raise ValueError("No se encontró el certificado X.509 del firmante.")

        def valores(oid) -> list[str]:
            resultado: list[str] = []
            try:
                for atributo in certificado.subject.get_attributes_for_oid(oid):
                    valor = str(atributo.value or "").strip()
                    if valor:
                        resultado.append(valor)
            except Exception:
                pass
            return resultado

        nombres = valores(NameOID.GIVEN_NAME)
        apellidos = valores(NameOID.SURNAME)
        comunes = valores(NameOID.COMMON_NAME)
        identificaciones = valores(NameOID.SERIAL_NUMBER)

        if nombres or apellidos:
            nombre_titular = " ".join(nombres + apellidos)
        elif comunes:
            nombre_titular = comunes[0]
        else:
            nombre_titular = certificado.subject.rfc4514_string()

        nombre_titular = FirmaService._normalizar_nombre(nombre_titular)
        if not nombre_titular:
            raise ValueError(
                "El certificado no contiene un nombre de titular reconocible."
            )

        emisor_cn = ""
        try:
            atributos_emisor = certificado.issuer.get_attributes_for_oid(
                NameOID.COMMON_NAME
            )
            if atributos_emisor:
                emisor_cn = str(atributos_emisor[0].value or "").strip()
        except Exception:
            emisor_cn = ""

        if not emisor_cn:
            try:
                emisor_cn = certificado.issuer.rfc4514_string()
            except Exception:
                emisor_cn = ""

        huella = certificado.fingerprint(hashes.SHA256()).hex().upper()

        return {
            "nombre_titular": nombre_titular,
            "identificacion": identificaciones[0] if identificaciones else "",
            "serial_certificado": format(certificado.serial_number, "X"),
            "huella_sha256": huella,
            "emisor": emisor_cn,
        }

    @staticmethod
    def _normalizar_nombre(nombre: str) -> str:
        """Normaliza espacios y convierte el nombre a mayúsculas."""
        limpio = re.sub(r"\s+", " ", str(nombre or "")).strip()
        return limpio.upper()

    @staticmethod
    def _construir_destino_qr(
        url_verificacion: str | None,
        huella_certificado: str,
        hash_documento: str,
        seccion: str,
        titular: str,
    ) -> str:
        """
        Define el contenido del QR.

        Si existe una URL institucional se utiliza directamente. En local se
        genera una URN trazable con el titular, la huella del certificado, el
        hash previo del documento y la sección firmada.
        """
        url = str(url_verificacion or "").strip()
        if url:
            return url

        huella_limpia = re.sub(r"[^A-Fa-f0-9]", "", huella_certificado)
        hash_limpio = re.sub(r"[^A-Fa-f0-9]", "", hash_documento)
        titular_seguro = re.sub(
            r"[^A-Za-z0-9]+",
            "-",
            FirmaService._normalizar_nombre(titular),
        ).strip("-")

        # En ambiente local se usa una carga compacta para que el QR sea
        # legible aun cuando la firma visible tenga un tamaño reducido. Los
        # valores completos continúan dentro de la firma criptográfica y en la
        # auditoría del sistema.
        return (
            f"INAMHI|{seccion}|"
            f"C:{huella_limpia[:24]}|"
            f"D:{hash_limpio[:24]}|"
            f"T:{titular_seguro[:28]}"
        )

    @staticmethod
    def _validar_parametros(
        pdf_path: str,
        output_path: str,
        cert_info: dict,
        posicion: dict,
    ) -> None:
        """Valida los datos mínimos antes de iniciar la firma."""
        if not pdf_path:
            raise ValueError("No se recibió la ruta del PDF de entrada.")

        if not os.path.isfile(pdf_path):
            raise FileNotFoundError(f"No se encontró el PDF de entrada: {pdf_path}")

        if not output_path:
            raise ValueError("No se recibió la ruta del PDF de salida.")

        if os.path.abspath(pdf_path) == os.path.abspath(output_path):
            raise ValueError(
                "La ruta de salida debe ser diferente de la ruta del PDF original."
            )

        if not isinstance(cert_info, dict):
            raise ValueError("La información del certificado no es válida.")

        if cert_info.get("_private_key") is None:
            raise ValueError("No se encontró la clave privada del certificado.")

        if cert_info.get("_certificate") is None:
            raise ValueError("No se encontró el certificado digital.")

        if not isinstance(posicion, dict):
            raise ValueError("La posición de la firma debe ser un diccionario.")

    @staticmethod
    def _resolver_indice_pagina(
        pagina: int | None,
        posicion: dict,
    ) -> int:
        """Obtiene el índice de página basado en cero para pyHanko."""
        valor = pagina

        if valor is None:
            for clave in (
                "pagina",
                "page",
                "on_page",
                "page_index",
                "indice_pagina",
            ):
                if clave in posicion:
                    valor = posicion.get(clave)
                    break

        if valor is None:
            valor = 0

        try:
            indice = int(valor)
        except (TypeError, ValueError) as error:
            raise ValueError(
                f"El índice de página de la firma no es válido: {valor!r}."
            ) from error

        if indice < 0:
            raise ValueError(
                "El índice de página no puede ser negativo. Use 0 para la primera página."
            )

        return indice

    @staticmethod
    def _resolver_caja_firma(posicion: dict) -> tuple[int, int, int, int]:
        """Valida y devuelve las coordenadas visibles de la firma."""
        faltantes = [
            clave
            for clave in ("x1", "y1", "x2", "y2")
            if clave not in posicion
        ]
        if faltantes:
            raise ValueError(
                "Faltan coordenadas para la firma: " + ", ".join(faltantes)
            )

        try:
            x1 = int(float(posicion["x1"]))
            y1 = int(float(posicion["y1"]))
            x2 = int(float(posicion["x2"]))
            y2 = int(float(posicion["y2"]))
        except (TypeError, ValueError) as error:
            raise ValueError(
                "Las coordenadas de la firma deben ser valores numéricos."
            ) from error

        if x2 <= x1 or y2 <= y1:
            raise ValueError(
                "La caja de firma es inválida. Debe cumplirse x2 > x1 e y2 > y1."
            )

        return x1, y1, x2, y2

    @staticmethod
    def _crear_signer(cert_info: dict):
        """Crea un SimpleSigner de pyHanko desde el certificado en memoria."""
        from asn1crypto import keys, x509
        from pyhanko.sign.signers.pdf_cms import SimpleSigner
        from pyhanko_certvalidator.registry import SimpleCertificateStore

        private_key = cert_info["_private_key"]
        certificate = cert_info["_certificate"]
        additional_certs = cert_info.get("_additional_certs", []) or []

        key_der = private_key.private_bytes(
            encoding=Encoding.DER,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption(),
        )
        cert_der = certificate.public_bytes(Encoding.DER)

        loaded_key = keys.PrivateKeyInfo.load(key_der)
        loaded_cert = x509.Certificate.load(cert_der)

        store = SimpleCertificateStore()
        for certificado_adicional in additional_certs:
            if certificado_adicional is None:
                continue

            store.register(
                x509.Certificate.load(
                    certificado_adicional.public_bytes(Encoding.DER)
                )
            )

        return SimpleSigner(
            signing_key=loaded_key,
            signing_cert=loaded_cert,
            cert_registry=store,
        )

    @staticmethod
    def calcular_hash(file_path: str) -> str | None:
        """Calcula el hash SHA-256 de un archivo."""
        sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as archivo:
                for bloque in iter(lambda: archivo.read(8192), b""):
                    sha256.update(bloque)
            return sha256.hexdigest()
        except Exception:
            return None

    @staticmethod
    def calcular_hash_bytes(data: bytes) -> str:
        """Calcula el hash SHA-256 de datos en memoria."""
        return hashlib.sha256(data).hexdigest()
