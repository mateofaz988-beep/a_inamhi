import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-nuevo-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nuevo-funcionario.html',
  styleUrls: ['./nuevo-funcionario.scss']
})
export class NuevoFuncionarioComponent {

  private readonly API_URL = 'http://localhost:5000/api/personal';

  guardando = false;

  modalidades: string[] = [
    'Nombramiento Permanente',
    'Contrato Ocasional',
    'Servicios Profesionales',
    'Código de Trabajo',
    'Prácticas Preprofesionales'
  ];

  cargos: string[] = [
    'Analista Meteorológico',
    'Analista Administrativo',
    'Asistente Administrativo',
    'Técnico en Climatología',
    'Especialista en Talento Humano',
    'Director',
    'Auxiliar de Servicios',
    'Coordinador Institucional'
  ];

  unidades: string[] = [
    'Dirección de Pronóstico',
    'Departamento de Estudios Climáticos',
    'Unidad de Talento Humano',
    'Dirección Administrativa',
    'Dirección Financiera',
    'Tecnologías de la Información',
    'Secretaría General',
    'Planificación'
  ];

  opcionesVulnerable: string[] = ['Sí', 'No'];

  nivelesInstruccion: string[] = [
    'Bachillerato',
    'Tercer Nivel',
    'Cuarto Nivel',
    'Tecnólogo',
    'Secundaria',
    'Primaria'
  ];

  etnias: string[] = [
    'Mestizo',
    'Indígena',
    'Afroecuatoriano',
    'Montubio',
    'Blanco',
    'Otro'
  ];

  tiposDiscapacidad: string[] = [
    'Ninguna',
    'Física',
    'Visual',
    'Auditiva',
    'Intelectual',
    'Psicosocial',
    'Otra'
  ];

  // Relación inteligente cargo -> unidad
  cargoUnidadMap: Record<string, string> = {
    'Analista Meteorológico': 'Dirección de Pronóstico',
    'Analista Administrativo': 'Dirección Administrativa',
    'Asistente Administrativo': 'Dirección Administrativa',
    'Técnico en Climatología': 'Departamento de Estudios Climáticos',
    'Especialista en Talento Humano': 'Unidad de Talento Humano',
    'Director': 'Planificación',
    'Auxiliar de Servicios': 'Secretaría General',
    'Coordinador Institucional': 'Planificación'
  };

  nuevo: any = {
    nro: '',
    cedula: '',
    nombres: '',
    modalidad: '',
    cargo: '',
    rmu: '',
    unidad: '',
    fecha_ingreso: '',
    fecha_nacimiento: '',
    direccion: '',
    email_inst: '',
    telefono: '',
    genero: '',
    instruccion: '',
    profesion: '',
    vulnerable: '',
    tipo_discapacidad: 'Ninguna',
    porcentaje_disc: '',
    etnia: '',
    observaciones: ''
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

  // =========================
  // CÉDULA ECUATORIANA
  // =========================
  validarCedulaEcuatoriana(cedula: string): boolean {
    if (!/^\d{10}$/.test(cedula)) return false;

    const provincia = Number(cedula.substring(0, 2));
    const tercerDigito = Number(cedula[2]);

    if (provincia < 1 || provincia > 24) return false;
    if (tercerDigito >= 6) return false;

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = Number(cedula[i]) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }

    const decenaSuperior = Math.ceil(suma / 10) * 10;
    const digitoValidador = decenaSuperior - suma === 10 ? 0 : decenaSuperior - suma;

    return digitoValidador === Number(cedula[9]);
  }

  // =========================
  // AUTOCOMPLETADO POR CARGO
  // =========================
  onCargoChange() {
    const unidadSugerida = this.cargoUnidadMap[this.nuevo.cargo];
    if (unidadSugerida) {
      this.nuevo.unidad = unidadSugerida;
    }
  }

  // =========================
  // CONTROL DISCAPACIDAD
  // =========================
  onDiscapacidadChange() {
    if (!this.nuevo.tipo_discapacidad || this.nuevo.tipo_discapacidad === 'Ninguna') {
      this.nuevo.porcentaje_disc = 0;
    } else if (this.nuevo.porcentaje_disc === '' || this.nuevo.porcentaje_disc === 0) {
      this.nuevo.porcentaje_disc = '';
    }
  }

  get porcentajeBloqueado(): boolean {
    return !this.nuevo.tipo_discapacidad || this.nuevo.tipo_discapacidad === 'Ninguna';
  }

  // =========================
  // VALIDACIÓN GENERAL
  // =========================
  validarFormulario(): boolean {
    if (!this.nuevo.nro?.toString().trim()) {
      Swal.fire('Error', 'El campo Nro es obligatorio', 'error');
      return false;
    }

    if (!this.nuevo.cedula || this.nuevo.cedula.toString().trim().length !== 10) {
      Swal.fire('Error', 'La cédula debe tener 10 dígitos', 'error');
      return false;
    }

    if (!this.validarCedulaEcuatoriana(this.nuevo.cedula.toString().trim())) {
      Swal.fire('Error', 'La cédula ecuatoriana no es válida', 'error');
      return false;
    }

    if (!this.nuevo.nombres || this.nuevo.nombres.trim().length < 3) {
      Swal.fire('Error', 'Ingrese nombres válidos', 'error');
      return false;
    }

    if (!this.nuevo.modalidad) {
      Swal.fire('Error', 'Seleccione la modalidad', 'error');
      return false;
    }

    if (!this.nuevo.cargo) {
      Swal.fire('Error', 'Seleccione el cargo', 'error');
      return false;
    }

    if (!this.nuevo.unidad) {
      Swal.fire('Error', 'Seleccione la unidad', 'error');
      return false;
    }

    if (!this.nuevo.genero || !['Masculino', 'Femenino'].includes(this.nuevo.genero)) {
      Swal.fire('Error', 'Seleccione un género válido', 'error');
      return false;
    }

    if (this.nuevo.email_inst && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.nuevo.email_inst)) {
      Swal.fire('Error', 'Correo institucional inválido', 'error');
      return false;
    }

    if (!this.porcentajeBloqueado) {
      if (
        this.nuevo.porcentaje_disc === '' ||
        Number(this.nuevo.porcentaje_disc) < 0 ||
        Number(this.nuevo.porcentaje_disc) > 100
      ) {
        Swal.fire('Error', 'El porcentaje de discapacidad debe estar entre 0 y 100', 'error');
        return false;
      }
    }

    return true;
  }

  guardar() {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede registrar funcionarios', 'warning');
      return;
    }

    if (this.guardando) return;
    if (!this.validarFormulario()) return;

    this.guardando = true;

    const payload = {
      nro: this.nuevo.nro?.toString().trim(),
      cedula: this.nuevo.cedula?.toString().trim(),
      nombres: this.nuevo.nombres?.toString().trim(),
      modalidad: this.nuevo.modalidad?.toString().trim(),
      cargo: this.nuevo.cargo?.toString().trim(),
      rmu: this.nuevo.rmu !== '' ? Number(this.nuevo.rmu) : 0,
      unidad: this.nuevo.unidad?.toString().trim(),
      fecha_ingreso: this.nuevo.fecha_ingreso || null,
      fecha_nacimiento: this.nuevo.fecha_nacimiento || null,
      direccion: this.nuevo.direccion?.toString().trim() || '',
      email_inst: this.nuevo.email_inst?.toString().trim() || '',
      telefono: this.nuevo.telefono?.toString().trim() || '',
      genero: this.nuevo.genero?.toString().trim(),
      instruccion: this.nuevo.instruccion?.toString().trim() || '',
      profesion: this.nuevo.profesion?.toString().trim() || '',
      vulnerable: this.nuevo.vulnerable?.toString().trim() || 'No',
      tipo_discapacidad: this.nuevo.tipo_discapacidad?.toString().trim() || 'Ninguna',
      porcentaje_disc: this.porcentajeBloqueado ? 0 : Number(this.nuevo.porcentaje_disc),
      etnia: this.nuevo.etnia?.toString().trim() || '',
      rol: 'usuario',
      observaciones: this.nuevo.observaciones?.toString().trim() || ''
    };

    console.log('Payload enviado:', payload);

    this.http.post(this.API_URL, payload, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          icon: 'success',
          title: 'Funcionario registrado',
          text: 'El registro se guardó correctamente',
          timer: 1800,
          showConfirmButton: false
        });

        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 1800);
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar funcionario:', err);
        console.error('Detalle backend:', err?.error);

        Swal.fire(
          'Error',
          err?.error?.error || 'No se pudo guardar el funcionario',
          'error'
        );
      }
    });
  }

  limpiarFormulario() {
    this.nuevo = {
      nro: '',
      cedula: '',
      nombres: '',
      modalidad: '',
      cargo: '',
      rmu: '',
      unidad: '',
      fecha_ingreso: '',
      fecha_nacimiento: '',
      direccion: '',
      email_inst: '',
      telefono: '',
      genero: '',
      instruccion: '',
      profesion: '',
      vulnerable: '',
      tipo_discapacidad: 'Ninguna',
      porcentaje_disc: '',
      etnia: '',
      observaciones: ''
    };
  }
}