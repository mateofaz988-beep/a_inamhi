"""
Conversión de Excel a PDF usando Microsoft Excel mediante automatización COM.

No utiliza LibreOffice. El PDF se genera con el motor de impresión de
Microsoft Excel, por lo que conserva el diseño, las áreas de impresión,
los saltos de página, las celdas combinadas, imágenes, bordes y formatos
de la plantilla ``plantilla_ap.xlsx``.

Requisitos del equipo Windows:
- Microsoft Excel instalado.
- pywin32 instalado en el mismo Python que ejecuta Flask.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any


class PdfConverter:
    """Convierte archivos Excel a PDF mediante Microsoft Excel COM."""

    # Constantes oficiales de Microsoft Excel.
    XL_TYPE_PDF = 0
    XL_QUALITY_STANDARD = 0
    XL_CALCULATION_AUTOMATIC = -4105
    MSO_AUTOMATION_SECURITY_FORCE_DISABLE = 3

    @staticmethod
    def _validar_pdf(ruta_pdf: Path) -> None:
        """Comprueba que el archivo generado sea un PDF real y no esté vacío."""
        if not ruta_pdf.exists() or not ruta_pdf.is_file():
            raise RuntimeError(
                f"Microsoft Excel no generó el PDF esperado: {ruta_pdf}"
            )

        if ruta_pdf.stat().st_size < 1000:
            raise RuntimeError(
                f"El PDF generado está vacío o incompleto: {ruta_pdf}"
            )

        with ruta_pdf.open("rb") as archivo:
            encabezado = archivo.read(5)

        if encabezado != b"%PDF-":
            raise RuntimeError(
                f"El archivo generado no tiene un encabezado PDF válido: {ruta_pdf}"
            )

    @staticmethod
    def _importar_com() -> tuple[Any, Any]:
        """Importa pywin32 con un mensaje claro cuando falta la dependencia."""
        if os.name != "nt":
            raise RuntimeError(
                "La conversión configurada utiliza Microsoft Excel y solo funciona "
                "en Windows. El servidor actual no es Windows."
            )

        try:
            import pythoncom  # type: ignore
            import win32com.client  # type: ignore
        except ImportError as error:
            raise RuntimeError(
                "Falta pywin32. Instálelo con el mismo Python que ejecuta Flask: "
                "python -m pip install pywin32==312"
            ) from error

        return pythoncom, win32com.client

    @staticmethod
    def _seleccionar_hoja_exportable(libro: Any) -> Any:
        """
        Selecciona la hoja que contiene la Acción de Personal.

        Se prioriza la hoja activa. Si no está visible, se toma la primera hoja
        visible que no parezca una hoja auxiliar de catálogos/listas.
        """
        nombres_auxiliares = {
            "hoja2",
            "datos",
            "listas",
            "lista",
            "catalogos",
            "catálogos",
            "parametros",
            "parámetros",
        }

        try:
            hoja_activa = libro.ActiveSheet
            if hoja_activa is not None and int(hoja_activa.Visible) == -1:
                if str(hoja_activa.Name).strip().lower() not in nombres_auxiliares:
                    return hoja_activa
        except Exception:
            pass

        for hoja in libro.Worksheets:
            try:
                visible = int(hoja.Visible) == -1
                nombre = str(hoja.Name).strip().lower()
                if visible and nombre not in nombres_auxiliares:
                    return hoja
            except Exception:
                continue

        try:
            return libro.Worksheets(1)
        except Exception as error:
            raise RuntimeError(
                "El archivo Excel no contiene una hoja que pueda exportarse."
            ) from error

    @staticmethod
    def convert_excel_to_pdf(
        excel_path: str,
        output_dir: str,
        _libreoffice_path_compat: str | None = None,
    ) -> str:
        """
        Convierte un Excel a PDF con Microsoft Excel.

        El tercer parámetro se conserva únicamente para mantener compatibilidad
        con el ``app.py`` existente, que todavía envía LIBREOFFICE_PATH. Su valor
        se ignora por completo.

        Args:
            excel_path: Ruta del Excel ya rellenado.
            output_dir: Carpeta en la que se guardará el PDF.
            _libreoffice_path_compat: Parámetro ignorado por compatibilidad.

        Returns:
            Ruta absoluta del PDF generado.
        """
        del _libreoffice_path_compat

        ruta_excel = Path(excel_path).expanduser().resolve()
        carpeta_salida = Path(output_dir).expanduser().resolve()

        if not ruta_excel.exists() or not ruta_excel.is_file():
            raise FileNotFoundError(
                f"No existe el Excel que se debe convertir: {ruta_excel}"
            )

        if ruta_excel.suffix.lower() not in {".xlsx", ".xls", ".xlsm"}:
            raise ValueError(
                "El archivo de entrada debe ser Excel (.xlsx, .xls o .xlsm)."
            )

        carpeta_salida.mkdir(parents=True, exist_ok=True)
        ruta_pdf = carpeta_salida / f"{ruta_excel.stem}.pdf"

        if ruta_pdf.exists():
            try:
                ruta_pdf.unlink()
            except PermissionError as error:
                raise RuntimeError(
                    f"Cierre el PDF que está abierto antes de regenerarlo: {ruta_pdf}"
                ) from error

        pythoncom, win32_client = PdfConverter._importar_com()

        excel = None
        libro = None
        com_inicializado = False

        try:
            # Flask atiende solicitudes en hilos; cada hilo debe inicializar COM.
            pythoncom.CoInitialize()
            com_inicializado = True

            try:
                excel = win32_client.DispatchEx("Excel.Application")
            except Exception as error:
                raise RuntimeError(
                    "No se pudo iniciar Microsoft Excel. Verifique que Excel esté "
                    "instalado y pueda abrirse normalmente en este equipo."
                ) from error

            excel.Visible = False
            excel.DisplayAlerts = False
            excel.ScreenUpdating = False
            excel.EnableEvents = False
            excel.AskToUpdateLinks = False

            try:
                excel.AutomationSecurity = (
                    PdfConverter.MSO_AUTOMATION_SECURITY_FORCE_DISABLE
                )
            except Exception:
                # Algunas versiones de Excel no permiten modificar esta propiedad.
                pass

            libro = excel.Workbooks.Open(
                str(ruta_excel),
                UpdateLinks=0,
                ReadOnly=True,
                IgnoreReadOnlyRecommended=True,
                AddToMru=False,
                Notify=False,
            )

            try:
                excel.Calculation = PdfConverter.XL_CALCULATION_AUTOMATIC
                excel.CalculateFullRebuild()
            except Exception:
                # La exportación puede continuar aun si el recálculo no está disponible.
                pass

            hoja = PdfConverter._seleccionar_hoja_exportable(libro)

            # Exporta solo la hoja de la Acción de Personal. Esto evita incluir
            # Hoja2 u otras hojas auxiliares con listas desplegables.
            hoja.ExportAsFixedFormat(
                Type=PdfConverter.XL_TYPE_PDF,
                Filename=str(ruta_pdf),
                Quality=PdfConverter.XL_QUALITY_STANDARD,
                IncludeDocProperties=True,
                IgnorePrintAreas=False,
                OpenAfterPublish=False,
            )

            # Excel puede tardar unos milisegundos en liberar/escribir el archivo.
            limite = time.monotonic() + 15
            while time.monotonic() < limite:
                if ruta_pdf.exists() and ruta_pdf.stat().st_size >= 1000:
                    break
                time.sleep(0.15)

            PdfConverter._validar_pdf(ruta_pdf)
            return str(ruta_pdf.resolve())

        except RuntimeError:
            raise
        except Exception as error:
            detalle = str(error).strip() or error.__class__.__name__
            raise RuntimeError(
                "Microsoft Excel no pudo convertir la plantilla a PDF. "
                f"Detalle: {detalle}"
            ) from error

        finally:
            if libro is not None:
                try:
                    libro.Close(SaveChanges=False)
                except Exception:
                    pass

            if excel is not None:
                try:
                    excel.Quit()
                except Exception:
                    pass

            # Liberar referencias COM antes de cerrar el apartamento COM.
            libro = None
            excel = None

            if com_inicializado:
                try:
                    pythoncom.CoUninitialize()
                except Exception:
                    pass
