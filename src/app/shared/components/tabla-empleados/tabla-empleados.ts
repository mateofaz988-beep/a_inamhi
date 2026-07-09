
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

import * as XLSX from 'xlsx-js-style';

@Component({
  selector: 'app-tabla-empleados',
  templateUrl: './tabla-empleados.html',
  styleUrls: ['./tabla-empleados.scss'],
  standalone: false
})
export class TablaEmpleadosComponent implements OnInit {

  personal: any[] = [];
  personalFiltrado: any[] = [];
  searchText = '';
  editIndex: number | null = null;
  loading = false;

  private readonly API_URL = `${String(environment.apiUrl || 'http://localhost:5000/api').replace(/\/$/, '')}/personal`;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public  authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerDatos();
  }

  private getHeaders() {
    return new HttpHeaders({ Authorization: this.authService.getToken() });
  }

  private alerta(icon: any, titulo: string, texto = '') {
    Swal.fire({ icon, title: titulo, text: texto, timer: 1800, showConfirmButton: false });
  }

  private validarEmpleado(emp: any): boolean {
    if (!emp.nombres || emp.nombres.trim().length < 3) {
      Swal.fire('Error', 'Nombre inválido (mínimo 3 caracteres)', 'error'); return false;
    }
    if (!emp.cedula || emp.cedula.toString().length !== 10) {
      Swal.fire('Error', 'Cédula inválida (debe tener 10 dígitos)', 'error'); return false;
    }
    if (!emp.modalidad) {
      Swal.fire('Error', 'Modalidad requerida', 'error'); return false;
    }
    if (!emp.genero) {
      Swal.fire('Error', 'Seleccione género', 'error'); return false;
    }
    return true;
  }

  obtenerDatos() {
    this.loading = true;
    this.http.get<any[]>(this.API_URL).subscribe({
      next: (data) => {
        this.personal         = data || [];
        this.personalFiltrado = [...this.personal];
        this.loading          = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.alerta('error', 'Error al cargar', 'No se pudieron obtener los datos del servidor');
      }
    });
  }

  habilitarEdicion(index: number) {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede editar registros', 'warning');
      return;
    }
    this.editIndex = index;
  }

  guardarCambios(emp: any) {
    if (!this.authService.isAdmin()) return;
    if (!this.validarEmpleado(emp)) return;

    this.http.put(`${this.API_URL}/${emp.id}`, emp, { headers: this.getHeaders() }).subscribe({
      next: () => { this.editIndex = null; this.alerta('success', 'Actualizado correctamente'); this.obtenerDatos(); },
      error: () => Swal.fire('Error', 'No se pudo actualizar el registro', 'error')
    });
  }

  cancelarEdicion() {
    this.editIndex = null;
    this.obtenerDatos();
  }

  eliminar(id: number) {
    if (!this.authService.isAdmin()) return;

    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor:  '#64748b'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() }).subscribe({
        next:  () => { this.alerta('success', 'Eliminado correctamente'); this.obtenerDatos(); },
        error: () => Swal.fire('Error', 'No se pudo eliminar el registro', 'error')
      });
    });
  }

  desvincularFuncionario(emp: any) {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede desvincular funcionarios', 'warning');
      return;
    }
    if (!emp?.id) {
      Swal.fire('Error', 'No se encontró el ID del funcionario', 'error');
      return;
    }

    Swal.fire({
      title: 'Desvincular funcionario',
      html: `
        <div style="text-align:left;line-height:1.7">
          <strong>Funcionario:</strong> ${emp.nombres || 'Sin nombre'}<br>
          <strong>Cédula:</strong> ${emp.cedula || 'Sin cédula'}<br><br>
          <span>Ingrese el motivo de desvinculación:</span>
        </div>
      `,
      input: 'textarea',
      inputPlaceholder: 'Ej: Terminación de contrato, renuncia, jubilación...',
      inputAttributes: { maxlength: '250' },
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) return 'Ingrese un motivo válido (mínimo 5 caracteres)';
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const motivo = String(result.value || '').trim();
      this.http.post<any>(`${this.API_URL}/${emp.id}/desvincular`, { motivo_salida: motivo }, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success', title: 'Funcionario desvinculado',
            text:  res?.message || 'El funcionario fue enviado a la lista de desvinculados',
            timer: 1900, showConfirmButton: false
          });
          this.obtenerDatos();
        },
        error: (err) => Swal.fire('Error', err?.error?.error || 'No se pudo desvincular', 'error')
      });
    });
  }

  buscar() {
    const texto = (this.searchText || '').toString().toLowerCase().trim();
    if (!texto) { this.personalFiltrado = [...this.personal]; return; }

    this.personalFiltrado = this.personal.filter(emp =>
      [emp?.nro, emp?.cedula, emp?.nombres, emp?.cargo, emp?.unidad]
        .some(v => (v ?? '').toString().toLowerCase().includes(texto))
    );
  }

  abrirModal() {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede registrar funcionarios', 'warning');
      return;
    }
    this.router.navigate(['/admin/nuevo-funcionario']);
  }

  // ── Excel ──────────────────────────────────────────────────────────────────
  exportarExcel() {
    const now   = new Date();
    const fecha = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;
    const stamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;

    const COLS = [
      'ID','Nro','Cédula','Nombres Completos','Modalidad','Cargo','RMU',
      'Unidad Administrativa','F. Ingreso','F. Nacimiento','Dirección',
      'Correo Institucional','Teléfono','Género','Instrucción','Profesión',
      'Vulnerable','Discapacidad','% Disc.','Etnia','Rol','Observaciones'
    ];

    const fmt = (d: any) => {
      if (!d) return '';
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? String(d) : `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`;
    };

    const rows = this.personalFiltrado.map(e => [
      e.id     ?? '', e.nro       ?? '', e.cedula    ?? '', e.nombres   ?? '',
      e.modalidad ?? '', e.cargo  ?? '', e.rmu       ?? '', e.unidad    ?? '',
      fmt(e.fecha_ingreso), fmt(e.fecha_nacimiento),
      e.direccion ?? '', e.email_inst ?? '', e.telefono ?? '', e.genero ?? '',
      e.instruccion ?? '', e.profesion ?? '', e.vulnerable ?? '',
      e.tipo_discapacidad ?? '', e.porcentaje_disc ?? '',
      e.etnia ?? '', e.rol ?? '', e.observaciones ?? ''
    ]);

    // ── Build worksheet (title + header + data) ──────────────────────────────
    const titleRow = [
      `MATRIZ INTEGRAL DE PERSONAL — INAMHI    |    Fecha: ${fecha}    |    Total registros: ${rows.length}`,
      ...Array(COLS.length - 1).fill('')
    ];

    const aoa: any[][] = [titleRow, COLS, ...rows];
    const ws: any = XLSX.utils.aoa_to_sheet(aoa);

    // ── Merges ───────────────────────────────────────────────────────────────
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } }
    ];

    // ── Row heights ──────────────────────────────────────────────────────────
    ws['!rows'] = [
      { hpt: 26 },
      { hpt: 18 },
      ...rows.map(() => ({ hpt: 15 }))
    ];

    // ── Freeze rows 0-1 (title + header) ────────────────────────────────────
    ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' };

    // ── Style helpers ────────────────────────────────────────────────────────
    const bdr = (rgb: string) => {
      const s = { style: 'thin', color: { rgb } };
      return { top: s, bottom: s, left: s, right: s };
    };

    const sTitle: any = {
      font:      { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
      fill:      { fgColor: { rgb: '0D1B3E' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border:    bdr('1E3A5F')
    };

    const sHeader: any = {
      font:      { bold: true, sz: 9, name: 'Calibri', color: { rgb: 'FFFFFF' } },
      fill:      { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border:    bdr('1D4ED8')
    };

    const sEven: any = {
      font:      { sz: 9, name: 'Calibri', color: { rgb: '1E293B' } },
      fill:      { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border:    bdr('E2E8F0')
    };

    const sOdd: any = {
      font:      { sz: 9, name: 'Calibri', color: { rgb: '1E293B' } },
      fill:      { fgColor: { rgb: 'EFF6FF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border:    bdr('E2E8F0')
    };

    // Left-aligned text columns (index in COLS array)
    const leftCols  = new Set([3, 5, 7, 10, 11, 14, 15, 21]);
    // RMU column index
    const rmuIdx    = 6;

    // ── Apply title style ────────────────────────────────────────────────────
    COLS.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = sTitle;
    });

    // ── Apply header styles ──────────────────────────────────────────────────
    COLS.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 1, c: ci });
      if (ws[ref]) ws[ref].s = sHeader;
    });

    // ── Apply data row styles ─────────────────────────────────────────────────
    rows.forEach((row, ri) => {
      const even = ri % 2 === 0;
      const base = even ? sEven : sOdd;

      row.forEach((_, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 2, c: ci });
        if (!ws[ref]) return;

        if (ci === rmuIdx) {
          ws[ref].s = {
            ...base,
            font:      { ...base.font, bold: true, color: { rgb: '15803D' } },
            alignment: { horizontal: 'right', vertical: 'center' }
          };
        } else if (leftCols.has(ci)) {
          ws[ref].s = { ...base, alignment: { horizontal: 'left', vertical: 'center' } };
        } else {
          ws[ref].s = base;
        }
      });
    });

    // ── Auto column widths (based on actual content) ──────────────────────────
    ws['!cols'] = COLS.map((header, ci) => {
      const maxContent = rows.reduce((mx, row) => {
        return Math.max(mx, String(row[ci] ?? '').length);
      }, 0);
      const width = Math.max(header.length, maxContent);
      // min 6, max 50, +2 padding
      return { wch: Math.min(Math.max(width + 2, 6), 50) };
    });

    // ── Write ────────────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personal');
    XLSX.writeFile(wb, `personal_inamhi_${stamp}.xlsx`);
  }
}
