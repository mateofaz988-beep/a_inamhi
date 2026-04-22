import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-solicitud-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-permisos.html',
  styleUrls: ['./solicitud-permisos.scss']
})
export class SolicitudPermisosComponent {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  private readonly API_URL = 'http://localhost:5000/api/personal/cedula';

  consultando = false;
  exportando = false;

  mostrarDocumento1 = true;
  mostrarDocumento2 = true;

  tiposPermiso: string[] = ['Vacaciones', 'Licencia', 'Permiso'];

  tiposAccionPersonal = [
    'Ingreso',
    'Reingreso',
    'Restitución',
    'Reintegro',
    'Ascenso',
    'Traslado',
    'Traspaso',
    'Cambio administrativo',
    'Intercambio voluntario',
    'Licencia',
    'Comisión de servicios',
    'Sanciones',
    'Incremento RMU',
    'Subrogación',
    'Encargo',
    'Cesación de funciones',
    'Destitución',
    'Vacaciones',
    'Revisión clas. puesto',
    'Otro'
  ];

  formulario: any = {
    cedula: '',
    apellidos: '',
    nombres: '',
    nombres_completos: '',
    ciudad: 'Quito',
    regimen_laboral: '',
    cargo: '',
    unidad: '',
    rmu: '',

    numero_accion: '',
    fecha_elaboracion: this.obtenerFechaActual(),
    desde: '',
    hasta: '',
    accion_personal: 'Vacaciones',
    motivo_legal:
      'De conformidad con la normativa institucional vigente y las disposiciones administrativas aplicables, se deja constancia de la acción de personal detallada en el presente documento.',
    referencia_1: '',
    referencia_2: '',

    proceso_institucional_actual: '',
    nivel_gestion_actual: '',
    unidad_actual: '',
    lugar_trabajo_actual: '',
    denominacion_actual: '',
    grupo_actual: '',
    grado_actual: '',
    remuneracion_actual: '',
    partida_actual: '',

    proceso_institucional_propuesta: '',
    nivel_gestion_propuesta: '',
    unidad_propuesta: '',
    lugar_trabajo_propuesta: '',
    denominacion_propuesta: '',
    grupo_propuesta: '',
    grado_propuesta: '',
    remuneracion_propuesta: '',
    partida_propuesta: '',

    lugar_posesion: '',
    documento_identificacion_posesion: '',
    nro_acta_final: '',
    fecha_acta_final: '',
    nombre_director_th: '',
    puesto_director_th: '',
    nombre_autoridad: '',
    puesto_autoridad: '',

    aceptacion_servidor: '',
    fecha_aceptacion: this.obtenerFechaActual(),
    hora_aceptacion: '',
    testigo_nombre: '',
    testigo_fecha: '',
    testigo_razon: '',

    elaborado_por: '',
    puesto_elaborado: '',
    revisado_por: '',
    puesto_revisado: '',
    registrado_por: '',
    puesto_registrado: '',

    comunicacion_electronica: false,
    fecha_notificacion: '',
    hora_notificacion: '',
    medio_notificacion: '',
    notificado_por: '',
    puesto_notificado: '',

    fecha_solicitud: this.obtenerFechaActual(),
    tipo_permiso: 'Vacaciones',
    fecha_inicio: '',
    fecha_terminacion: '',
    observacion: '',
    solicitado_por: '',
    puesto_solicitante: '',
    autorizado_por: '',
    puesto_autorizado: '',
    no_registros: 1,
    impreso_por: '',
    fecha_impresion: this.obtenerFechaActual()
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService
  ) {}

  getHeaders() {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }

  obtenerFechaActual(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatearFechaVisual(fecha: string): string {
    if (!fecha) return '';
    const partes = fecha.split('-');
    if (partes.length !== 3) return fecha;
    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  }

  formatearFechaHoraVisual(fecha: string): string {
    if (!fecha) return '';
    if (fecha.includes(' ')) return fecha;
    return this.formatearFechaVisual(fecha);
  }

  separarNombreCompleto(nombreCompleto: string) {
    const limpio = (nombreCompleto || '').trim().replace(/\s+/g, ' ');

    if (!limpio) {
      return { apellidos: '', nombres: '' };
    }

    const partes = limpio.split(' ');

    if (partes.length >= 4) {
      return {
        apellidos: `${partes[0]} ${partes[1]}`,
        nombres: partes.slice(2).join(' ')
      };
    }

    if (partes.length === 3) {
      return {
        apellidos: `${partes[0]} ${partes[1]}`,
        nombres: partes[2]
      };
    }

    if (partes.length === 2) {
      return {
        apellidos: partes[0],
        nombres: partes[1]
      };
    }

    return {
      apellidos: partes[0],
      nombres: ''
    };
  }

  seleccionarTodosDocumentos() {
    this.mostrarDocumento1 = true;
    this.mostrarDocumento2 = true;
  }

  limpiarSeleccionDocumentos() {
    this.mostrarDocumento1 = false;
    this.mostrarDocumento2 = false;
  }

  hayDocumentosSeleccionados(): boolean {
    return this.mostrarDocumento1 || this.mostrarDocumento2;
  }

  resumenDocumentos(): string {
    const docs: string[] = [];
    if (this.mostrarDocumento1) docs.push('Documento 1');
    if (this.mostrarDocumento2) docs.push('Documento 2');
    return docs.join(', ');
  }

  consultarCedula() {
    const cedula = (this.formulario.cedula || '').trim();

    if (!cedula) {
      Swal.fire('Atención', 'Ingrese una cédula', 'warning');
      return;
    }

    if (!/^\d{10}$/.test(cedula)) {
      Swal.fire('Error', 'La cédula debe tener exactamente 10 dígitos', 'error');
      return;
    }

    this.consultando = true;

    this.http.get<any>(`${this.API_URL}/${cedula}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.consultando = false;

        const separado = this.separarNombreCompleto(data.nombres || '');

        this.formulario.cedula = data.cedula || this.formulario.cedula;
        this.formulario.apellidos = separado.apellidos;
        this.formulario.nombres = separado.nombres;
        this.formulario.nombres_completos = data.nombres || '';
        this.formulario.regimen_laboral = data.modalidad || '';
        this.formulario.cargo = data.cargo || '';
        this.formulario.unidad = data.unidad || '';
        this.formulario.rmu = data.rmu || '';

        this.formulario.unidad_actual = data.unidad || '';
        this.formulario.lugar_trabajo_actual = this.formulario.ciudad || 'Quito';
        this.formulario.denominacion_actual = data.cargo || '';
        this.formulario.remuneracion_actual = data.rmu || '';

        this.formulario.unidad_propuesta = data.unidad || '';
        this.formulario.lugar_trabajo_propuesta = this.formulario.ciudad || 'Quito';
        this.formulario.denominacion_propuesta = data.cargo || '';
        this.formulario.remuneracion_propuesta = data.rmu || '';

        this.formulario.aceptacion_servidor = data.nombres || '';
        this.formulario.elaborado_por = this.formulario.elaborado_por || data.nombres || '';

        this.formulario.solicitado_por = data.nombres || '';
        this.formulario.puesto_solicitante = data.cargo || '';
        this.formulario.impreso_por = data.nombres || '';

        if (!this.formulario.observacion?.trim()) {
          this.formulario.observacion = this.formulario.tipo_permiso;
        }

        Swal.fire({
          icon: 'success',
          title: 'Datos encontrados',
          text: 'La información se cargó correctamente',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.consultando = false;
        console.error('Error al consultar cédula:', err);

        Swal.fire(
          'Error',
          err?.error?.error || 'No se encontraron datos para esa cédula',
          'error'
        );
      }
    });
  }

  limpiarFormulario() {
    this.formulario = {
      cedula: '',
      apellidos: '',
      nombres: '',
      nombres_completos: '',
      ciudad: 'Quito',
      regimen_laboral: '',
      cargo: '',
      unidad: '',
      rmu: '',

      numero_accion: '',
      fecha_elaboracion: this.obtenerFechaActual(),
      desde: '',
      hasta: '',
      accion_personal: 'Vacaciones',
      motivo_legal:
        'De conformidad con la normativa institucional vigente y las disposiciones administrativas aplicables, se deja constancia de la acción de personal detallada en el presente documento.',
      referencia_1: '',
      referencia_2: '',

      proceso_institucional_actual: '',
      nivel_gestion_actual: '',
      unidad_actual: '',
      lugar_trabajo_actual: '',
      denominacion_actual: '',
      grupo_actual: '',
      grado_actual: '',
      remuneracion_actual: '',
      partida_actual: '',

      proceso_institucional_propuesta: '',
      nivel_gestion_propuesta: '',
      unidad_propuesta: '',
      lugar_trabajo_propuesta: '',
      denominacion_propuesta: '',
      grupo_propuesta: '',
      grado_propuesta: '',
      remuneracion_propuesta: '',
      partida_propuesta: '',

      lugar_posesion: '',
      documento_identificacion_posesion: '',
      nro_acta_final: '',
      fecha_acta_final: '',
      nombre_director_th: '',
      puesto_director_th: '',
      nombre_autoridad: '',
      puesto_autoridad: '',

      aceptacion_servidor: '',
      fecha_aceptacion: this.obtenerFechaActual(),
      hora_aceptacion: '',
      testigo_nombre: '',
      testigo_fecha: '',
      testigo_razon: '',

      elaborado_por: '',
      puesto_elaborado: '',
      revisado_por: '',
      puesto_revisado: '',
      registrado_por: '',
      puesto_registrado: '',

      comunicacion_electronica: false,
      fecha_notificacion: '',
      hora_notificacion: '',
      medio_notificacion: '',
      notificado_por: '',
      puesto_notificado: '',

      fecha_solicitud: this.obtenerFechaActual(),
      tipo_permiso: 'Vacaciones',
      fecha_inicio: '',
      fecha_terminacion: '',
      observacion: '',
      solicitado_por: '',
      puesto_solicitante: '',
      autorizado_por: '',
      puesto_autorizado: '',
      no_registros: 1,
      impreso_por: '',
      fecha_impresion: this.obtenerFechaActual()
    };
  }

  validarAntesDeExportar(): boolean {
    if (!this.hayDocumentosSeleccionados()) {
      Swal.fire('Atención', 'Seleccione al menos un documento', 'warning');
      return false;
    }

    if (!this.formulario.cedula?.trim()) {
      Swal.fire('Atención', 'Ingrese la cédula', 'warning');
      return false;
    }

    if (!this.formulario.apellidos?.trim()) {
      Swal.fire('Atención', 'Complete los apellidos', 'warning');
      return false;
    }

    if (!this.formulario.nombres?.trim()) {
      Swal.fire('Atención', 'Complete los nombres', 'warning');
      return false;
    }

    return true;
  }

  async exportarPDF() {
    if (!this.validarAntesDeExportar()) return;
    if (!this.pdfContent) {
      Swal.fire('Error', 'No se encontró el contenido para exportar', 'error');
      return;
    }

    this.exportando = true;

    try {
      const contenedor = this.pdfContent.nativeElement as HTMLElement;
      const paginas = contenedor.querySelectorAll('.pdf-page-a4');

      if (!paginas.length) {
        this.exportando = false;
        Swal.fire('Error', 'No hay páginas seleccionadas para exportar', 'error');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < paginas.length; i++) {
        const pagina = paginas[i] as HTMLElement;

        const canvas = await html2canvas(pagina, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 210;
        const pdfHeight = 297;

        if (i > 0) {
          pdf.addPage('a4', 'p');
        }

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      pdf.save(`documentos-inamhi-${this.formulario.cedula || 'sin-cedula'}.pdf`);
      this.exportando = false;
    } catch (error) {
      console.error('Error exportando PDF:', error);
      this.exportando = false;
      Swal.fire('Error', 'No se pudo exportar el PDF', 'error');
    }
  }
}