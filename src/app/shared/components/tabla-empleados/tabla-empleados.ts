import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import Swal from 'sweetalert2';

// EXPORTACIONES
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-tabla-empleados',
  templateUrl: './tabla-empleados.html',
  styleUrls: ['./tabla-empleados.scss'],
  standalone: false
})
export class TablaEmpleadosComponent implements OnInit {

  personal: any[] = [];
  personalFiltrado: any[] = [];
  searchText: string = '';
  editIndex: number | null = null;

  private readonly API_URL = 'http://localhost:5000/api/personal';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerDatos();
  }

  // =========================
  // HEADERS
  // =========================
  getHeaders() {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  // =========================
  // ALERTA
  // =========================
  alerta(icon: any, titulo: string, texto: string = '') {
    Swal.fire({
      icon,
      title: titulo,
      text: texto,
      timer: 1800,
      showConfirmButton: false
    });
  }

  // =========================
  // VALIDACIÓN
  // =========================
  validarEmpleado(emp: any): boolean {

    if (!emp.nombres || emp.nombres.trim().length < 3) {
      Swal.fire('Error', 'Nombre inválido', 'error');
      return false;
    }

    if (!emp.cedula || emp.cedula.toString().length !== 10) {
      Swal.fire('Error', 'Cédula inválida', 'error');
      return false;
    }

    if (!emp.modalidad) {
      Swal.fire('Error', 'Modalidad requerida', 'error');
      return false;
    }

    if (!emp.genero) {
      Swal.fire('Error', 'Seleccione género', 'error');
      return false;
    }

    return true;
  }

  // =========================
  // GET
  // =========================
  obtenerDatos() {
    this.http.get<any[]>(this.API_URL).subscribe({
      next: (data) => {
        this.personal = data;
        this.personalFiltrado = [...data];
        this.cdr.detectChanges();
      },
      error: () => this.alerta('error', 'Error', 'No se pudieron cargar los datos')
    });
  }

  // =========================
  // EDITAR
  // =========================
  habilitarEdicion(index: number) {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', '', 'warning');
      return;
    }
    this.editIndex = index;
  }

  guardarCambios(emp: any) {

    if (!this.authService.isAdmin()) return;

    if (!this.validarEmpleado(emp)) return;

    this.http.put(`${this.API_URL}/${emp.id}`, emp, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.editIndex = null;
        this.alerta('success', 'Actualizado');
        this.obtenerDatos();
      },
      error: () => Swal.fire('Error', 'No se pudo actualizar', 'error')
    });
  }

  cancelarEdicion() {
    this.editIndex = null;
    this.obtenerDatos();
  }

  // =========================
  // DELETE
  // =========================
  eliminar(id: number) {

    if (!this.authService.isAdmin()) return;

    Swal.fire({
      title: '¿Eliminar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.http.delete(`${this.API_URL}/${id}`, {
          headers: this.getHeaders()
        }).subscribe({
          next: () => {
            this.alerta('success', 'Eliminado');
            this.obtenerDatos();
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  // =========================
  // BUSCAR
  // =========================
  buscar() {
    const texto = this.searchText?.toString().toLowerCase().trim() || '';

    if (!texto) {
      this.personalFiltrado = [...this.personal];
      return;
    }

    this.personalFiltrado = this.personal.filter(emp => {
      const nro = emp?.nro?.toString().toLowerCase().trim() || '';
      const cedula = emp?.cedula?.toString().toLowerCase().trim() || '';
      const nombres = emp?.nombres?.toString().toLowerCase().trim() || '';

      return (
        nro.includes(texto) ||
        cedula.includes(texto) ||
        nombres.includes(texto)
      );
    });
  }

  // =========================
  // NUEVA VENTANA:
  // /admin/nuevo-funcionario
  // =========================
  abrirModal() {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede registrar funcionarios', 'warning');
      return;
    }

    this.router.navigate(['/admin/nuevo-funcionario']);
  }

  // =========================
  // OPCIONAL:
  // si luego cambias el HTML a
  // (click)="irANuevoFuncionario()"
  // =========================
  irANuevoFuncionario() {
    this.abrirModal();
  }

  // =========================
  // 📊 EXPORTAR EXCEL
  // =========================
  exportarExcel() {
    const data = this.personalFiltrado.map(emp => ({
      ID: emp.id,
      Nro: emp.nro,
      Cedula: emp.cedula,
      Nombres: emp.nombres,
      Modalidad: emp.modalidad,
      Cargo: emp.cargo,
      RMU: emp.rmu,
      Unidad: emp.unidad,
      Fecha_Ingreso: emp.fecha_ingreso,
      Fecha_Nacimiento: emp.fecha_nacimiento,
      Direccion: emp.direccion,
      Correo_Institucional: emp.email_inst,
      Telefono: emp.telefono,
      Genero: emp.genero,
      Instruccion: emp.instruccion,
      Profesion: emp.profesion,
      Vulnerable: emp.vulnerable,
      Discapacidad: emp.tipo_discapacidad,
      Porcentaje_Discapacidad: emp.porcentaje_disc,
      Etnia: emp.etnia,
      Rol: emp.rol,
      Observaciones: emp.observaciones
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Personal');
    XLSX.writeFile(wb, 'personal.xlsx');
  }

  // =========================
// 📄 EXPORTAR PDF COMPLETO
// =========================
exportarPDF() {
  const doc = new jsPDF('landscape', 'mm', 'a3');

  const data = this.personalFiltrado.map((e, index) => [
    e.id ?? '',
    e.nro ?? '',
    e.cedula ?? '',
    e.nombres ?? '',
    e.modalidad ?? '',
    e.cargo ?? '',
    e.rmu ?? '',
    e.unidad ?? '',
    e.fecha_ingreso ?? '',
    e.fecha_nacimiento ?? '',
    e.direccion ?? '',
    e.email_inst ?? '',
    e.telefono ?? '',
    e.genero ?? '',
    e.instruccion ?? '',
    e.profesion ?? '',
    e.vulnerable ?? '',
    e.tipo_discapacidad ?? '',
    e.porcentaje_disc ?? '',
    e.etnia ?? '',
    e.rol ?? '',
    e.observaciones ?? ''
  ]);

  autoTable(doc, {
    head: [[
      'ID',
      'Nro',
      'Cédula',
      'Nombres',
      'Modalidad',
      'Cargo',
      'RMU',
      'Unidad',
      'F. Ingreso',
      'F. Nacimiento',
      'Dirección',
      'Correo Institucional',
      'Teléfono',
      'Género',
      'Instrucción',
      'Profesión',
      'Vulnerable',
      'Discapacidad',
      '% Disc.',
      'Etnia',
      'Rol',
      'Observaciones'
    ]],
    body: data,
    startY: 18,
    styles: {
      fontSize: 6,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'center'
    },
    headStyles: {
      fillColor: [13, 110, 253],
      textColor: 255,
      fontSize: 6,
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      textColor: 30
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10 },  // ID
      1: { cellWidth: 12 },  // Nro
      2: { cellWidth: 20 },  // Cédula
      3: { cellWidth: 38 },  // Nombres
      4: { cellWidth: 28 },  // Modalidad
      5: { cellWidth: 34 },  // Cargo
      6: { cellWidth: 16 },  // RMU
      7: { cellWidth: 38 },  // Unidad
      8: { cellWidth: 20 },  // F. Ingreso
      9: { cellWidth: 20 },  // F. Nacimiento
      10: { cellWidth: 34 }, // Dirección
      11: { cellWidth: 38 }, // Correo
      12: { cellWidth: 20 }, // Teléfono
      13: { cellWidth: 18 }, // Género
      14: { cellWidth: 26 }, // Instrucción
      15: { cellWidth: 28 }, // Profesión
      16: { cellWidth: 20 }, // Vulnerable
      17: { cellWidth: 24 }, // Discapacidad
      18: { cellWidth: 16 }, // % Disc.
      19: { cellWidth: 20 }, // Etnia
      20: { cellWidth: 20 }, // Rol
      21: { cellWidth: 42 }  // Observaciones
    },
    margin: { top: 15, right: 8, bottom: 10, left: 8 },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.text('Matriz Integral de Personal - INAMHI', 14, 10);

      doc.setFontSize(8);
      doc.text(`Total de registros: ${this.personalFiltrado.length}`, 14, 15);
    }
  });

  doc.save('personal_completo.pdf');
}
}