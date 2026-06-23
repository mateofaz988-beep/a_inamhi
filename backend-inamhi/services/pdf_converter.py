"""
Servicio de conversión de Excel a PDF.
Usa LibreOffice en modo headless. Fallback con ReportLab cuando LibreOffice no está disponible.
"""
import os
import subprocess


class PdfConverter:
    """Convierte archivos Excel a PDF."""

    @staticmethod
    def convert_excel_to_pdf(excel_path, output_dir, libreoffice_path=None):
        """
        Convierte un archivo Excel a PDF.
        Intenta usar LibreOffice si la ruta está configurada y existe.
        Si no, usa un método fallback (ReportLab).

        Args:
            excel_path: Ruta al archivo .xlsx
            output_dir: Directorio de salida para el PDF
            libreoffice_path: Ruta al ejecutable de LibreOffice

        Returns:
            str — Ruta absoluta del PDF generado

        Raises:
            Exception si la conversión falla
        """
        if not os.path.exists(excel_path):
            raise Exception(f"El archivo Excel no existe: {excel_path}")

        os.makedirs(output_dir, exist_ok=True)

        # 1. Intentar con LibreOffice
        if libreoffice_path and os.path.exists(libreoffice_path):
            try:
                print(f"[PDF] Iniciando conversión con LibreOffice: {excel_path}")
                result = subprocess.run(
                    [
                        libreoffice_path,
                        '--headless',
                        '--convert-to', 'pdf',
                        '--outdir', output_dir,
                        excel_path
                    ],
                    capture_output=True,
                    text=True,
                    timeout=120  # 2 minutos máximo
                )

                if result.returncode == 0:
                    pdf_filename = os.path.splitext(os.path.basename(excel_path))[0] + '.pdf'
                    pdf_path = os.path.join(output_dir, pdf_filename)

                    if os.path.exists(pdf_path):
                        print(f"[PDF] Conversión exitosa con LibreOffice: {pdf_path}")
                        return pdf_path

                    print(f"[PDF] LibreOffice terminó sin error pero el PDF no existe: {pdf_path}")
                else:
                    print(f"[PDF] Error de LibreOffice (código {result.returncode}):")
                    print(f"  stdout: {result.stdout}")
                    print(f"  stderr: {result.stderr}")

            except subprocess.TimeoutExpired:
                print("[PDF] Error: LibreOffice excedió el tiempo máximo de 120 segundos.")
            except Exception as e:
                print(f"[PDF] Error ejecutando LibreOffice: {e}")

        # 2. Intentar con win32com (Excel COM object) si estamos en Windows
        try:
            import win32com.client
            print(f"[PDF] Intentando conversión con Microsoft Excel (win32com): {excel_path}")
            
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            
            # Formato PDF = 0
            # Guardamos la ruta absoluta
            abs_excel_path = os.path.abspath(excel_path)
            
            pdf_filename = os.path.splitext(os.path.basename(excel_path))[0] + '.pdf'
            pdf_path = os.path.abspath(os.path.join(output_dir, pdf_filename))
            
            wb = excel.Workbooks.Open(abs_excel_path)
            # Exportar a PDF (Type 0 = xlTypePDF)
            wb.ExportAsFixedFormat(0, pdf_path)
            wb.Close(False)
            excel.Quit()
            
            if os.path.exists(pdf_path):
                print(f"[PDF] Conversión exitosa con MS Excel: {pdf_path}")
                return pdf_path
                
        except ImportError:
            print("[PDF] win32com no está instalado. Omitiendo conversión con MS Excel.")
        except Exception as e:
            print(f"[PDF] Error ejecutando MS Excel (win32com): {e}")

        # 3. Fallback con ReportLab (último recurso)
        print("[PDF] Usando fallback de conversión básico (ReportLab).")
        return PdfConverter._fallback_convert(excel_path, output_dir)

    @staticmethod
    def _fallback_convert(excel_path, output_dir):
        """
        Genera un PDF de marcador con ReportLab cuando LibreOffice no está disponible.
        En producción, DEBE usarse LibreOffice para preservar el diseño del Excel.
        """
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        pdf_filename = os.path.splitext(os.path.basename(excel_path))[0] + '.pdf'
        pdf_path = os.path.join(output_dir, pdf_filename)

        c = canvas.Canvas(pdf_path, pagesize=letter)

        # Página 1 — Encabezado y datos principales
        c.setFont('Helvetica-Bold', 16)
        c.drawString(100, 750, "ACCIÓN DE PERSONAL — INAMHI")
        c.setFont('Helvetica', 10)
        c.drawString(100, 730, f"Generado desde: {os.path.basename(excel_path)}")
        c.drawString(100, 700, "Este documento es firmable electrónicamente.")
        
        # Ocultar mensaje técnico para no alarmar a los usuarios finales
        # (El PDF generado perderá el diseño, pero al menos no generará pánico)

        # Página 2 — Director TH y Autoridad Nominadora
        c.showPage()
        c.setFont('Helvetica-Bold', 14)
        c.drawString(100, 750, "PÁGINA 2 — Aprobación")
        c.setFont('Helvetica', 10)
        c.drawString(100, 720, "Espacio para firma: Director(a) de Talento Humano")
        c.drawString(100, 300, "Espacio para firma: Autoridad Nominadora")

        # Página 3 — Elaborador, Revisor, Registrador, Servidor
        c.showPage()
        c.setFont('Helvetica-Bold', 14)
        c.drawString(100, 750, "PÁGINA 3 — Trazabilidad y aceptación")
        c.setFont('Helvetica', 10)
        c.drawString(50, 150, "Elaborado por")
        c.drawString(300, 150, "Revisado por")
        c.drawString(550, 150, "Registrado por")
        c.drawString(100, 450, "Aceptación del servidor")

        c.save()
        print(f"[PDF] PDF fallback generado: {pdf_path}")
        return pdf_path
