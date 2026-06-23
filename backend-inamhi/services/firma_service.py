"""
Servicio de firma electrónica PDF.
Utiliza pyHanko para aplicar firmas digitales criptográficas incrementales.
Cada firma se aplica sobre la última versión del PDF sin invalidar las anteriores.
"""
import os
import hashlib
from io import BytesIO
from datetime import datetime, timezone, timedelta

from pyhanko.sign import signers, fields
from pyhanko.sign.signers.pdf_signer import PdfSigner
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.stamp import TextStampStyle
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption


class FirmaService:
    """Servicio para firmar PDFs de forma incremental con certificados PKCS#12."""

    @staticmethod
    def firmar_pdf(
        pdf_path: str,
        output_path: str,
        cert_info: dict,
        seccion: str,
        firmante: str,
        cargo: str,
        posicion: dict
    ) -> tuple:
        """
        Firma un PDF de forma incremental.

        Args:
            pdf_path: Ruta del PDF a firmar
            output_path: Ruta donde se guardará el PDF firmado
            cert_info: Dict con datos del certificado (del CertificadoService)
            seccion: Nombre de la sección que se firma
            firmante: Nombre del firmante
            cargo: Cargo del firmante
            posicion: Dict con pagina, x1, y1, x2, y2

        Returns:
            (bool, str|None) — (éxito, mensaje de error)
        """
        try:
            # 1. Leer el PDF completo a memoria para evitar problemas de I/O
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()

            pdf_buffer = BytesIO(pdf_data)

            # 2. Crear el IncrementalPdfFileWriter sobre el buffer
            writer = IncrementalPdfFileWriter(pdf_buffer)

            # 3. Preparar el texto visible de la firma
            tz_ec = timezone(timedelta(hours=-5))
            fecha_str = datetime.now(tz_ec).strftime('%d/%m/%Y %H:%M:%S')

            texto_visible = (
                f"Firmado electrónicamente por:\n"
                f"{firmante}\n"
                f"Cargo: {cargo}\n"
                f"Fecha: {fecha_str}\n"
                f"Sección: {seccion}"
            )

            # 4. Nombre único del campo de firma
            field_name = f"Firma_{seccion}"

            # 5. Página (pyHanko usa base 0)
            page_idx = posicion.get('pagina', 1) - 1

            # 6. Crear campo de firma visual
            sig_field = fields.SigFieldSpec(
                field_name,
                box=(posicion['x1'], posicion['y1'], posicion['x2'], posicion['y2']),
                on_page=page_idx
            )
            fields.append_signature_field(writer, sig_field_spec=sig_field)

            # 7. Crear el signer desde los datos del certificado en memoria
            signer = FirmaService._crear_signer(cert_info)

            # 8. Estilo visual
            style = TextStampStyle(
                stamp_text=texto_visible,
                border_width=1,
                background_opacity=0.0
            )

            # 9. Metadata de la firma
            meta = signers.PdfSignatureMetadata(
                field_name=field_name,
                reason=f"Aprobación: {seccion}",
                location="Ecuador",
            )

            # 10. Crear PdfSigner y firmar
            pdf_signer = PdfSigner(
                signature_meta=meta,
                signer=signer,
                stamp_style=style
            )

            # 11. Escribir el PDF firmado
            output_buffer = BytesIO()
            pdf_signer.sign_pdf(
                writer,
                output=output_buffer,
                in_place=False
            )

            # 12. Guardar a disco
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as outf:
                outf.write(output_buffer.getvalue())

            return True, None

        except Exception as e:
            import traceback
            traceback.print_exc()
            return False, str(e)

    @staticmethod
    def _crear_signer(cert_info: dict):
        """
        Crea un SimpleSigner de pyHanko a partir de los datos del certificado.
        Usa la API correcta de pyHanko 0.35.x.
        """
        from pyhanko.sign.signers.pdf_cms import SimpleSigner
        from pyhanko_certvalidator.registry import SimpleCertificateStore
        from asn1crypto import x509, keys
        
        private_key = cert_info['_private_key']
        certificate = cert_info['_certificate']
        additional_certs = cert_info.get('_additional_certs', [])

        # Exportar a DER (formato binario nativo) para cargarlo en asn1crypto
        key_der = private_key.private_bytes(
            encoding=Encoding.DER,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption()
        )
        cert_der = certificate.public_bytes(Encoding.DER)

        loaded_key = keys.PrivateKeyInfo.load(key_der)
        loaded_cert = x509.Certificate.load(cert_der)
        
        # Registrar certificados adicionales si existen (ca_chain, etc)
        store = SimpleCertificateStore()
        for c in additional_certs:
            if c is not None:
                store.register(x509.Certificate.load(c.public_bytes(Encoding.DER)))

        return SimpleSigner(
            signing_key=loaded_key,
            signing_cert=loaded_cert,
            cert_registry=store
        )

    @staticmethod
    def calcular_hash(file_path: str) -> str | None:
        """Calcula el hash SHA-256 de un archivo."""
        sha256 = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for bloque in iter(lambda: f.read(8192), b''):
                    sha256.update(bloque)
            return sha256.hexdigest()
        except Exception:
            return None

    @staticmethod
    def calcular_hash_bytes(data: bytes) -> str:
        """Calcula el hash SHA-256 de datos en memoria."""
        return hashlib.sha256(data).hexdigest()
