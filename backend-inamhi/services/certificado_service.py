"""
Servicio de certificados digitales PKCS#12.
Carga, valida y extrae información pública del certificado.
No almacena claves privadas ni contraseñas.
"""
from datetime import datetime, timezone
from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
from cryptography.x509.oid import NameOID


class CertificadoService:
    """Servicio para carga y validación de certificados .p12/.pfx."""

    @staticmethod
    def cargar_certificado(p12_bytes: bytes, password: str) -> dict:
        """
        Carga un certificado PKCS#12 y devuelve información pública.

        Args:
            p12_bytes: Contenido binario del archivo .p12/.pfx
            password: Contraseña del certificado

        Returns:
            dict con datos del certificado o error
        """
        try:
            password_bytes = password.encode('utf-8') if isinstance(password, str) else password

            private_key, certificate, additional_certs = load_key_and_certificates(
                p12_bytes,
                password_bytes
            )

            if certificate is None:
                return {
                    'valido': False,
                    'error': 'El archivo no contiene un certificado válido.'
                }

            # Extraer datos públicos del certificado
            nombre = CertificadoService._obtener_atributo(certificate.subject, NameOID.COMMON_NAME)
            emisor = CertificadoService._obtener_atributo(certificate.issuer, NameOID.COMMON_NAME)
            organizacion = CertificadoService._obtener_atributo(certificate.issuer, NameOID.ORGANIZATION_NAME)
            serial_number = CertificadoService._obtener_atributo(certificate.subject, NameOID.SERIAL_NUMBER)

            return {
                'valido': True,
                'nombre_titular': nombre,
                'identificacion_titular': serial_number,
                'emisor': emisor,
                'organizacion_emisor': organizacion,
                'serial': str(certificate.serial_number),
                'inicio_vigencia': certificate.not_valid_before_utc,
                'fin_vigencia': certificate.not_valid_after_utc,
                'algoritmo': certificate.signature_algorithm_oid._name if hasattr(certificate.signature_algorithm_oid, '_name') else str(certificate.signature_algorithm_oid.dotted_string),
                # Datos criptográficos para la firma (se usan en memoria, NO se almacenan)
                '_private_key': private_key,
                '_certificate': certificate,
                '_additional_certs': additional_certs or [],
            }

        except ValueError:
            return {
                'valido': False,
                'error': 'La contraseña del certificado no es correcta.'
            }
        except Exception as e:
            error_str = str(e).lower()
            if 'password' in error_str or 'mac' in error_str or 'decrypt' in error_str:
                return {
                    'valido': False,
                    'error': 'La contraseña del certificado no es correcta.'
                }
            return {
                'valido': False,
                'error': f'El certificado no es válido o está corrupto: {str(e)}'
            }

    @staticmethod
    def validar_vigencia(cert_info: dict) -> tuple:
        """
        Valida que el certificado esté vigente.

        Returns:
            (bool, str) — (vigente, mensaje)
        """
        if not cert_info.get('valido'):
            return False, cert_info.get('error', 'Certificado inválido')

        ahora_utc = datetime.now(timezone.utc)

        if cert_info['inicio_vigencia'] > ahora_utc:
            return False, 'El certificado aún no está vigente.'

        if cert_info['fin_vigencia'] < ahora_utc:
            return False, 'El certificado ha expirado.'

        return True, 'Certificado vigente'

    @staticmethod
    def _obtener_atributo(name_obj, oid) -> str:
        """Extrae un atributo del subject/issuer del certificado."""
        try:
            attrs = name_obj.get_attributes_for_oid(oid)
            return attrs[0].value if attrs else ''
        except Exception:
            return ''
