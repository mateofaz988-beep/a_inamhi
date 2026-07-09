import fitz
import sys

try:
    doc = fitz.open(r'c:\Users\Sistemas\Documents\inamhi rrhh\a_inamhi\backend-inamhi\storage\documentos\22\pdf\AP-RH-2026-00155.pdf')
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        blocks = page.get_text('dict')['blocks']
        print(f'\n--- PAGE {page_num + 1} ---')
        for b in blocks:
            if 'lines' in b:
                for l in b['lines']:
                    for s in l['spans']:
                        text = s['text'].strip()
                        if text in ['SITUACION ACTUAL', 'SITUACION PROPUESTA', 'POSESIÓN DEL PUESTO', 'DIRECTOR (A) O RESPONSABLE DE TALENTO HUMANO', 'AUTORIDAD NOMINADORA O SU DELEGADO', 'FIRMA:', 'NOMBRE:'] or 'ELABORADO POR' in text.upper():
                            print(f"{text!r}: bbox={s['bbox']}")
except Exception as e:
    print(e)
