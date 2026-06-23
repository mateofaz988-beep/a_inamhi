import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

import { AuthService } from '../../core/services/auth';

interface PersonalEstructura {
  id?: number;
  nombres: string;
  provincia?: string;
  canton?: string;
  denominacion_puesto: string;
  unidad_organica?: string;
}

interface Autoridad {
  nombres: string;
  denominacion_puesto: string;
  unidad_organica?: string;
}

interface UnidadInstitucional {
  nombre: string;
  baseLegal: string;
}

interface PersonalApiResponse {
  cedula?: string;
  nombres?: string;
  modalidad?: string;
  cargo?: string;
  unidad?: string;
  rmu?: string | number | null;
  grupo_ocupacional?: string;
  rol?: string;
}

interface PersonalApiItem {
  id?: number;
  nombres?: string;
  nombre?: string;
  provincia?: string;
  canton?: string;
  denominacion_puesto?: string;
  cargo?: string;
  unidad_organica?: string;
  unidad?: string;
}

interface FirmaDocumento {
  seccion: string;
  estado: string;
  nombre_firmante: string;
  cargo_firmante: string;
  fecha_firma: string | null;
  orden_firma: number;
}

interface ApiMessageResponse {
  message?: string;
  mensaje?: string;
}

type ApiListResponse<T> = T[] | { data?: T[] } | null | undefined;

type CampoResponsable =
  | 'nombre_director_th'
  | 'puesto_director_th'
  | 'nombre_autoridad'
  | 'puesto_autoridad'
  | 'elaborado_por'
  | 'puesto_elaborado'
  | 'revisado_por'
  | 'puesto_revisado'
  | 'registrado_por'
  | 'puesto_registrado'
  | 'solicitado_por'
  | 'puesto_solicitante'
  | 'autorizado_por'
  | 'puesto_autorizado'
  | 'notificado_por'
  | 'puesto_notificado';

interface FormularioAccionPersonal {
  cedula: string;
  apellidos: string;
  nombres: string;
  nombres_completos: string;
  ciudad: string;
  regimen_laboral: string;
  cargo: string;
  unidad: string;
  rmu: string;

  numero_accion: string;
  fecha_elaboracion: string;
  desde: string;
  hasta: string;
  accion_personal: string;
  motivo_legal: string;
  referencia_1: string;
  referencia_2: string;

  proceso_institucional_actual: string;
  nivel_gestion_actual: string;
  unidad_actual: string;
  lugar_trabajo_actual: string;
  denominacion_actual: string;
  grupo_actual: string;
  grupo_ocupacional: string;
  grado_actual: string;
  remuneracion_actual: string;
  partida_actual: string;

  proceso_institucional_propuesta: string;
  nivel_gestion_propuesta: string;
  unidad_propuesta: string;
  lugar_trabajo_propuesta: string;
  denominacion_propuesta: string;
  grupo_propuesta: string;
  grado_propuesta: string;
  remuneracion_propuesta: string;
  partida_propuesta: string;

  lugar_posesion: string;
  documento_identificacion_posesion: string;
  nro_acta_final: string;
  fecha_acta_final: string;
  nombre_director_th: string;
  puesto_director_th: string;
  nombre_autoridad: string;
  puesto_autoridad: string;

  aceptacion_servidor: string;
  fecha_aceptacion: string;
  hora_aceptacion: string;
  testigo_nombre: string;
  testigo_fecha: string;
  testigo_razon: string;

  elaborado_por: string;
  puesto_elaborado: string;
  revisado_por: string;
  puesto_revisado: string;
  registrado_por: string;
  puesto_registrado: string;

  comunicacion_electronica: boolean;
  fecha_notificacion: string;
  hora_notificacion: string;
  medio_notificacion: string;
  notificado_por: string;
  puesto_notificado: string;

  fecha_solicitud: string;
  tipo_permiso: string;
  fecha_inicio: string;
  fecha_terminacion: string;
  observacion: string;
  solicitado_por: string;
  puesto_solicitante: string;
  autorizado_por: string;
  puesto_autorizado: string;
  no_registros: number;
  impreso_por: string;
  uso_exclusivo_th: string;
  fecha_impresion: string;
}

@Component({
  selector: 'app-solicitud-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-permisos.html',
  styleUrls: ['./solicitud-permisos.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolicitudPermisosComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiUrl || 'http://localhost:5000/api';

  private readonly endpoints = {
    consultarCedula: `${this.apiBaseUrl}/personal/cedula`,
    estructuraPersonal: `${this.apiBaseUrl}/personal-estructura`,
    autoridades: `${this.apiBaseUrl}/autoridades`,
    firmarEmpleado: `${this.apiBaseUrl}/permisos/firmar_empleado`,
    generarAccion: `${this.apiBaseUrl}/generar-accion`,
    guardarBorrador: `${this.apiBaseUrl}/acciones-personal`,
    prepararFirmas: (id: number) => `${this.apiBaseUrl}/acciones-personal/${id}/preparar-firmas`,
    listarFirmas: (id: number) => `${this.apiBaseUrl}/acciones-personal/${id}/firmas`,
    firmarSeccion: (id: number) => `${this.apiBaseUrl}/acciones-personal/${id}/firmar`,
    descargarPdf: (id: number) => `${this.apiBaseUrl}/acciones-personal/${id}/pdf`,
    finalizarDocumento: (id: number) => `${this.apiBaseUrl}/acciones-personal/${id}/finalizar`
  } as const;

  private readonly maxCertificadoBytes = 10 * 1024 * 1024;

  consultando = false;
  generandoExcel = false;
  firmando = false;
  mostrarPrevia = false;
  
  preparandoDocumento = false;
  descargandoPdf = false;
  cargandoFirmas = false;
  documentoActualId: number | null = null;
  firmasDocumento: FirmaDocumento[] = [];
  firmaSeleccionada: FirmaDocumento | null = null;
  mostrarModalFirma = false;
  mostrarOffcanvasFirmas = false; // Nueva variable de estado para el panel lateral
  passwordFirmaSeccion = '';

  passwordFirma = '';
  selectedFile: File | null = null;

  estructuraPersonal: PersonalEstructura[] = [];
  listaAutoridades: Autoridad[] = [];

  readonly tiposPermiso = ['Vacaciones', 'Licencia', 'Permiso'] as const;

  readonly gruposOcupacionales = [
    'SERVIDOR PÚBLICO DE APOYO 1',
    'SERVIDOR PÚBLICO DE APOYO 2',
    'SERVIDOR PÚBLICO DE APOYO 3',
    'SERVIDOR PÚBLICO DE APOYO 4',
    'SERVIDOR PÚBLICO 1',
    'SERVIDOR PÚBLICO 2',
    'SERVIDOR PÚBLICO 3',
    'SERVIDOR PÚBLICO 4',
    'NIVEL JERÁRQUICO SUPERIOR 2'
  ] as const;

  readonly tiposAccionPersonal = [
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
  ] as const;

  readonly unidadesInstitucionales: readonly UnidadInstitucional[] = [
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA ESMERALDAS - MIRA',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se establece su competencia para la ejecución técnica y operativa de la red de observación en la zona norte del país.'
    },
    {
      nombre: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS',
      baseLegal:
        'De conformidad con la Ley Orgánica de Servicio Público (LOSEP) y su Reglamento, se dispone la administración integral del talento humano, procesos de selección, capacitación y regímenes remunerativos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA MORONA SANTIAGO',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se faculta el monitoreo hidrometeorológico de la región amazónica sur para la prevención de eventos adversos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA NAPO',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se asigna la gestión operativa y técnica de las estaciones meteorológicas en la zona centro-norte de la Amazonía.'
    },
    {
      nombre: 'DIRECCIÓN DE PRONÓSTICOS Y ALERTAS HIDROMETEOROLÓGICAS',
      baseLegal:
        'De conformidad con la Ley de Meteorología e Hidrología y su Reglamento, se establece la responsabilidad de vigilancia atmosférica, generación de alertas tempranas y seguridad meteorológica aérea.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA JUBONES - PUYANGO',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se dictamina el control técnico de la red hidrometeorológica en las cuencas del sur occidente del territorio ecuatoriano.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA PASTAZA',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se establece la supervisión y mantenimiento preventivo de la red de estaciones en la zona central amazónica.'
    },
    {
      nombre: 'DIRECCIÓN DE ESTUDIOS, INVESTIGACIÓN Y DESARROLLO HIDROMETEOROLÓGICO',
      baseLegal:
        'De conformidad con el Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación, se dispone la generación de modelos científicos y estudios de adaptación al cambio climático.'
    },
    {
      nombre: 'DIRECCIÓN DE LABORATORIO DE AGUAS Y SEDIMENTOS',
      baseLegal:
        'De conformidad con las normas técnicas de calidad ISO/IEC 17025, se autoriza la ejecución de ensayos físicos y químicos para la determinación de la calidad del recurso hídrico y sedimentos.'
    },
    {
      nombre: 'DIRECCIÓN DE ASESORÍA JURÍDICA',
      baseLegal:
        'De conformidad con el Código Orgánico Administrativo (COA), se establece la función de patrocinio legal, control de legalidad de los actos administrativos y suscripción de convenios institucionales.'
    },
    {
      nombre: 'DIRECCIÓN DE LA RED NACIONAL DE OBSERVACIÓN HIDROMETEOROLÓGICA',
      baseLegal:
        'De conformidad con el Plan Nacional de Gestión de Riesgos, se faculta la planificación, instalación y operatividad de la infraestructura de estaciones automáticas y convencionales a nivel nacional.'
    },
    {
      nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA',
      baseLegal:
        'De conformidad con el Código Orgánico de Planificación y Finanzas Públicas, se dispone la gestión presupuestaria, contable y los procesos de contratación pública bajo la normativa del SERCOP.'
    },
    {
      nombre: 'DIRECCIÓN DE INFORMACIÓN HIDROMETEOROLÓGICA',
      baseLegal:
        'De conformidad con la Ley Orgánica de Transparencia y Acceso a la Información Pública (LOTAIP), se asigna la administración del Banco Nacional de Datos y la validación de información histórica.'
    },
    {
      nombre: 'DIRECCIÓN DE PLANIFICACIÓN',
      baseLegal:
        'De conformidad con la normativa de optimización y eficiencia del Estado, se establece la elaboración del Plan Estratégico Institucional (PEI) y el seguimiento de indicadores de gestión y resultados.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA GUAYAS - GALÁPAGOS',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se determina el monitoreo climático marino-costero y de la región insular para el seguimiento de eventos oceánicos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA MANABÍ',
      baseLegal:
        'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se faculta asegurar la operatividad técnica y recolección de datos climáticos en la zona costera central.'
    },
    {
      nombre: 'DIRECCIÓN DE COMUNICACIÓN SOCIAL',
      baseLegal:
        'De conformidad con la Ley Orgánica de Comunicación, se dispone el manejo de la imagen institucional y la difusión oficial de avisos meteorológicos y alertas a la ciudadanía.'
    },
    {
      nombre: 'DIRECCIÓN EJECUTIVA',
      baseLegal:
        'De conformidad con el Decreto Ejecutivo de creación del INAMHI, se establece la dirección superior, representación legal y la articulación estratégica con organismos nacionales e internacionales.'
    }
  ];

  private readonly estructuraPersonalBase: readonly PersonalEstructura[] = [
    {
      nombres: 'TUFIÑO JUNIA ALEX ISRAEL',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'DIRECTOR/A DE ADMINISTRACION DE TALENTO HUMANO',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'OCAÑA BONILLA LEONOR KAROLINA',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'SECRETARIA',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'DUEÑAS JARAMILLO OSCAR FACUNDO',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'ANALISTA DE RECURSOS HUMANOS',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CABEZAS ALMEIDA JANNETH ALEXANDRA',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'ANALISTA DE TALENTO HUMANO 2',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'PAREDES ANDRANGO MIGUEL ANGEL',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'ANALISTA 3 DE TALENTO HUMANO',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CUTI AMAGUAÑA GINA ELIZABETH',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'ANALISTA DE TALENTO HUMANO 1',
      unidad_organica: 'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CORNEJO HIDALGO PABLO ANDRES',
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      denominacion_puesto: 'DIRECTOR EJECUTIVO, ENCARGADO',
      unidad_organica: 'DIRECCION EJECUTIVA'
    }
  ];

  formulario: FormularioAccionPersonal = this.crearFormularioInicial();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.cargarEstructuraPersonal();
    this.cargarAutoridades();
  }

  getHeaders(): HttpHeaders {
    const token = String(this.authService.getToken() || '').trim();

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: token
    });
  }

  volver(): void {
    void this.router.navigate(['/admin/dashboard']);
  }

  obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  formatearFechaVisual(fecha: string | null | undefined): string {
    const texto = String(fecha || '').trim();

    if (!texto) {
      return '';
    }

    const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!coincidencia) {
      return texto;
    }

    const [, anio, mes, dia] = coincidencia;
    return `${dia}/${mes}/${anio}`;
  }

  formatearFechaHoraVisual(fecha: string | null | undefined): string {
    const texto = String(fecha || '').trim();

    if (!texto) {
      return '';
    }

    const coincidencia = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (!coincidencia) {
      return texto;
    }

    const [, anio, mes, dia, hora, minuto] = coincidencia;
    const fechaVisual = `${dia}/${mes}/${anio}`;

    return hora && minuto ? `${fechaVisual} ${hora}:${minuto}` : fechaVisual;
  }

  separarNombreCompleto(
    nombreCompleto: string | null | undefined
  ): { apellidos: string; nombres: string } {
    const limpio = String(nombreCompleto || '')
      .trim()
      .replace(/\s+/g, ' ');

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

  normalizarTexto(valor: unknown): string {
    return String(valor || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  buscarUnidadInstitucional(
    nombreUnidad: string | null | undefined
  ): UnidadInstitucional | undefined {
    const unidadNormalizada = this.normalizarTexto(nombreUnidad);

    return this.unidadesInstitucionales.find(
      (unidad) => this.normalizarTexto(unidad.nombre) === unidadNormalizada
    );
  }

  onUnidadChange(): void {
    const unidad = this.buscarUnidadInstitucional(this.formulario.unidad);

    if (!unidad) {
      return;
    }

    this.formulario.unidad = unidad.nombre;
    this.formulario.unidad_actual = unidad.nombre;
    this.formulario.unidad_propuesta = unidad.nombre;
    this.formulario.motivo_legal = unidad.baseLegal;
  }

  aplicarBaseLegalPorUnidad(unidadNombre: string): void {
    const unidad = this.buscarUnidadInstitucional(unidadNombre);
    const nombre = unidad?.nombre || String(unidadNombre || '').trim();

    this.formulario.unidad = nombre;
    this.formulario.unidad_actual = nombre;
    this.formulario.unidad_propuesta = nombre;

    if (unidad) {
      this.formulario.motivo_legal = unidad.baseLegal;
    }
  }

  cargarEstructuraPersonal(): void {
    this.estructuraPersonal = this.ordenarYDepurarPersonas([
      ...this.estructuraPersonalBase
    ]);

    this.http
      .get<ApiListResponse<PersonalApiItem>>(this.endpoints.estructuraPersonal, {
        headers: this.getHeaders()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const registros = this.extraerRegistros(respuesta)
            .map((item) => this.transformarPersona(item))
            .filter(
              (item): item is PersonalEstructura =>
                item !== null
            );

          if (registros.length) {
            this.estructuraPersonal =
              this.ordenarYDepurarPersonas(registros);
          }

          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          console.warn(
            'No se pudo cargar la estructura de personal. Se utilizará la lista local.',
            error
          );
          this.cdr.markForCheck();
        }
      });
  }

  cargarAutoridades(): void {
    this.listaAutoridades = this.obtenerAutoridadesLocales();

    this.http
      .get<ApiListResponse<PersonalApiItem>>(this.endpoints.autoridades, {
        headers: this.getHeaders()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const autoridades = this.extraerRegistros(respuesta)
            .map((item) => this.transformarPersona(item))
            .filter(
              (item): item is PersonalEstructura =>
                item !== null
            )
            .map<Autoridad>((item) => ({
              nombres: item.nombres,
              denominacion_puesto: item.denominacion_puesto,
              unidad_organica: item.unidad_organica
            }));

          if (autoridades.length) {
            this.listaAutoridades =
              this.ordenarYDepurarAutoridades(autoridades);
          }

          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          console.warn(
            'No se pudo cargar la lista de autoridades. Se utilizará la lista local.',
            error
          );
          this.cdr.markForCheck();
        }
      });
  }

  buscarPersonaEstructura(
    nombre: string | null | undefined
  ): PersonalEstructura | undefined {
    const nombreNormalizado = this.normalizarTexto(nombre);

    return this.estructuraPersonal.find(
      (persona) =>
        this.normalizarTexto(persona.nombres) === nombreNormalizado
    );
  }

  seleccionarResponsable(
    campoNombre: CampoResponsable,
    campoPuesto: CampoResponsable,
    nombre: string
  ): void {
    const nombreLimpio = String(nombre || '').trim();
    const nombreNormalizado = this.normalizarTexto(nombreLimpio);

    const persona =
      this.buscarPersonaEstructura(nombreLimpio) ??
      this.listaAutoridades.find(
        (autoridad) =>
          this.normalizarTexto(autoridad.nombres) === nombreNormalizado
      );

    this.formulario[campoNombre] = nombreLimpio;
    this.formulario[campoPuesto] =
      persona?.denominacion_puesto || '';

    this.cdr.markForCheck();
  }

  consultarCedula(): void {
    if (this.consultando) {
      return;
    }

    const cedula = String(this.formulario.cedula || '')
      .replace(/\D/g, '')
      .slice(0, 10);

    this.formulario.cedula = cedula;

    if (!/^\d{10}$/.test(cedula)) {
      void Swal.fire(
        'Cédula inválida',
        'Ingrese exactamente 10 dígitos, sin espacios ni guiones.',
        'warning'
      );
      return;
    }

    this.consultando = true;
    this.cdr.markForCheck();

    this.http
      .get<PersonalApiResponse>(
        `${this.endpoints.consultarCedula}/${encodeURIComponent(cedula)}`,
        { headers: this.getHeaders() }
      )
      .pipe(
        finalize(() => {
          this.consultando = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.aplicarDatosFuncionario(data);

          void Swal.fire({
            icon: 'success',
            title: 'Datos encontrados',
            text: 'La información del funcionario se cargó correctamente.',
            timer: 1600,
            showConfirmButton: false
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al consultar la cédula:', error);
          void this.mostrarErrorHttp(
            'No fue posible consultar la cédula',
            error,
            'No se encontraron datos para la cédula ingresada.'
          );
        }
      });
  }

  async limpiarFormulario(): Promise<void> {
    const resultado = await Swal.fire({
      icon: 'question',
      title: '¿Limpiar el formulario?',
      text: 'Los datos ingresados y el certificado seleccionado se eliminarán.',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!resultado.isConfirmed) {
      return;
    }

    this.formulario = this.crearFormularioInicial();
    this.selectedFile = null;
    this.passwordFirma = '';
    this.mostrarPrevia = false;
    this.consultando = false;
    this.generandoExcel = false;
    this.firmando = false;

    this.limpiarInputCertificado();
    this.cdr.markForCheck();

    void Swal.fire({
      icon: 'success',
      title: 'Formulario limpio',
      timer: 1100,
      showConfirmButton: false
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.selectedFile = null;
      this.cdr.markForCheck();
      return;
    }

    if (!archivo.name.toLowerCase().endsWith('.p12') && !archivo.name.toLowerCase().endsWith('.pfx')) {
      input.value = '';
      this.selectedFile = null;

      void Swal.fire(
        'Archivo no válido',
        'Seleccione un certificado digital con extensión .p12 o .pfx.',
        'warning'
      );
      return;
    }

    if (archivo.size > this.maxCertificadoBytes) {
      input.value = '';
      this.selectedFile = null;

      void Swal.fire(
        'Archivo demasiado grande',
        'El certificado no debe superar los 10 MB.',
        'warning'
      );
      return;
    }

    this.selectedFile = archivo;
    this.cdr.markForCheck();
  }



  /**
   * Se conserva este método por compatibilidad con llamadas existentes.
   * Su función real es validar y abrir la vista previa.
   */
  generarExcel(): void {
    const errorValidacion = this.validarDatosMinimos();

    if (errorValidacion) {
      void Swal.fire('Información incompleta', errorValidacion, 'warning');
      return;
    }

    this.mostrarPrevia = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      document
        .querySelector('.preview-card')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  ejecutarDescargaExcel(): void {
    if (this.generandoExcel) {
      return;
    }

    const errorValidacion = this.validarDatosMinimos();

    if (errorValidacion) {
      void Swal.fire('Información incompleta', errorValidacion, 'warning');
      return;
    }

    this.generandoExcel = true;
    this.cdr.markForCheck();

    const payload = this.construirPayloadExcel();

    this.http
      .post(this.endpoints.generarAccion, payload, {
        headers: this.getHeaders(),
        responseType: 'blob'
      })
      .pipe(
        finalize(() => {
          this.generandoExcel = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (blob: Blob) => {
          this.mostrarPrevia = false;
          this.descargarBlob(blob, this.construirNombreArchivoExcel());

          void Swal.fire({
            icon: 'success',
            title: 'Documento generado',
            text: 'El archivo Excel se descargó correctamente.',
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (error: HttpErrorResponse) => {
          void this.mostrarErrorHttp(
            'Error al generar el Excel',
            error,
            'No fue posible generar el documento Excel.'
          );
        }
      });
  }

  private crearFormularioInicial(): FormularioAccionPersonal {
    const fechaActual = this.obtenerFechaActual();

    return {
      cedula: '',
      apellidos: '',
      nombres: '',
      nombres_completos: '',
      ciudad: 'Quito',
      regimen_laboral: '',
      cargo: '',
      unidad: '',
      rmu: '',

      numero_accion: `AP-RH-${new Date().getFullYear()}-`,
      fecha_elaboracion: fechaActual,
      desde: fechaActual,
      hasta: fechaActual,
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
      grupo_ocupacional: '',
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
      fecha_aceptacion: fechaActual,
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

      fecha_solicitud: fechaActual,
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
      uso_exclusivo_th: '',
      fecha_impresion: fechaActual
    };
  }

  private aplicarDatosFuncionario(data: PersonalApiResponse): void {
    const nombreCompleto = String(data?.nombres || '').trim();
    const nombresSeparados = this.separarNombreCompleto(nombreCompleto);
    const rmu = data?.rmu == null ? '' : String(data.rmu);
    const ciudad = this.formulario.ciudad || 'Quito';
    const unidadEncontrada = this.buscarUnidadInstitucional(data?.unidad);
    const nombreUnidad =
      unidadEncontrada?.nombre || String(data?.unidad || '').trim();

    const procesoNormalizado = this.normalizarTexto(data?.rol);
    const procesosPermitidos = new Set([
      'GOBERNANTE',
      'SUSTANTIVO',
      'ADJETIVO'
    ]);

    const proceso = procesosPermitidos.has(procesoNormalizado)
      ? procesoNormalizado
      : '';

    this.formulario = {
      ...this.formulario,
      cedula: String(data?.cedula || this.formulario.cedula).trim(),
      apellidos: nombresSeparados.apellidos,
      nombres: nombresSeparados.nombres,
      nombres_completos: nombreCompleto,
      regimen_laboral: String(data?.modalidad || '').trim(),
      cargo: String(data?.cargo || '').trim(),
      unidad: nombreUnidad,
      unidad_actual: nombreUnidad,
      unidad_propuesta: nombreUnidad,
      rmu,
      grupo_ocupacional: String(data?.grupo_ocupacional || '').trim(),
      proceso_institucional_actual: proceso,
      proceso_institucional_propuesta: proceso,
      lugar_trabajo_actual: ciudad,
      lugar_trabajo_propuesta: ciudad,
      denominacion_actual: String(data?.cargo || '').trim(),
      denominacion_propuesta: String(data?.cargo || '').trim(),
      remuneracion_actual: rmu,
      remuneracion_propuesta: rmu,
      motivo_legal:
        unidadEncontrada?.baseLegal || this.formulario.motivo_legal,
      aceptacion_servidor: nombreCompleto,
      elaborado_por:
        this.formulario.elaborado_por || nombreCompleto,
      solicitado_por: nombreCompleto,
      puesto_solicitante: String(data?.cargo || '').trim(),
      impreso_por: nombreCompleto,
      observacion:
        this.formulario.observacion.trim() ||
        this.formulario.tipo_permiso
    };

    this.cdr.markForCheck();
  }

  private validarDatosMinimos(): string | null {
    const cedula = this.formulario.cedula.trim();

    if (!/^\d{10}$/.test(cedula)) {
      return 'Ingrese o consulte una cédula válida de 10 dígitos.';
    }

    if (
      !this.formulario.apellidos.trim() ||
      !this.formulario.nombres.trim()
    ) {
      return 'Consulte la cédula para cargar los nombres y apellidos del funcionario.';
    }

    if (!this.formulario.desde.trim()) {
      return 'Seleccione la fecha desde la cual rige la acción de personal.';
    }

    if (
      this.formulario.hasta &&
      this.formulario.hasta < this.formulario.desde
    ) {
      return 'La fecha hasta no puede ser anterior a la fecha desde.';
    }

    return null;
  }

  private validarFirma(): string | null {
    const errorBase = this.validarDatosMinimos();

    if (errorBase) {
      return errorBase;
    }

    if (!this.selectedFile) {
      return 'Seleccione el certificado digital en formato .p12.';
    }

    if (!this.passwordFirma) {
      return 'Ingrese la contraseña del certificado digital.';
    }

    return null;
  }

  private construirPayloadExcel(): Record<string, string> {
    const f = this.formulario;

    return {
      numero_accion: f.numero_accion || '',
      fecha_elaboracion: f.fecha_elaboracion || '',
      ciudad: f.ciudad || 'Quito',

      apellidos: f.apellidos || '',
      nombres: f.nombres || '',
      cedula: f.cedula || '',
      regimen_laboral: f.regimen_laboral || '',
      cargo: f.cargo || '',
      rmu: f.rmu || '',

      tipo_accion: (f.accion_personal || '').toUpperCase(),
      fecha_rige_desde: f.desde || '',
      fecha_rige_hasta: f.hasta || '',

      proceso_institucional_actual:
        f.proceso_institucional_actual || '',
      nivel_gestion_actual: f.nivel_gestion_actual || '',
      unidad_administrativa: f.unidad || '',
      lugar_trabajo_actual:
        f.lugar_trabajo_actual || f.ciudad || '',
      denominacion_actual:
        f.denominacion_actual || f.cargo || '',
      grupo_ocupacional: f.grupo_ocupacional || '',
      partida_actual: f.partida_actual || '',

      proceso_institucional_propuesta:
        f.proceso_institucional_propuesta ||
        f.proceso_institucional_actual ||
        '',
      nivel_gestion_propuesta:
        f.nivel_gestion_propuesta ||
        f.nivel_gestion_actual ||
        '',
      unidad_administrativa_propuesta:
        f.unidad_propuesta || f.unidad || '',
      lugar_trabajo_propuesta:
        f.lugar_trabajo_propuesta ||
        f.lugar_trabajo_actual ||
        '',
      denominacion_propuesta:
        f.denominacion_propuesta ||
        f.denominacion_actual ||
        '',
      partida_propuesta:
        f.partida_propuesta || f.partida_actual || '',

      motivo_legal: f.motivo_legal || '',

      nombre_director_th: f.nombre_director_th || '',
      puesto_director_th: f.puesto_director_th || '',
      nombre_autoridad: f.nombre_autoridad || '',
      puesto_autoridad: f.puesto_autoridad || '',

      aceptacion_servidor:
        f.aceptacion_servidor ||
        `${f.apellidos} ${f.nombres}`.trim(),
      fecha_aceptacion:
        f.fecha_aceptacion || f.fecha_elaboracion || '',

      elaborado_por: f.elaborado_por || '',
      puesto_elaborado: f.puesto_elaborado || '',
      revisado_por: f.revisado_por || '',
      puesto_revisado: f.puesto_revisado || '',
      registrado_por: f.registrado_por || '',
      puesto_registrado: f.puesto_registrado || ''
    };
  }

  private construirNombreArchivoExcel(): string {
    const identificador = [
      this.formulario.apellidos,
      this.formulario.cedula
    ]
      .filter(Boolean)
      .join('_');

    const nombreSeguro = this.normalizarTexto(identificador)
      .replace(/[^A-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `AP_${nombreSeguro || 'DOCUMENTO'}.xlsx`;
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    try {
      enlace.href = url;
      enlace.download = nombreArchivo;
      enlace.style.display = 'none';

      document.body.appendChild(enlace);
      enlace.click();
    } finally {
      enlace.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
  }

  private extraerRegistros<T>(respuesta: ApiListResponse<T>): T[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    return Array.isArray(respuesta?.data) ? respuesta.data : [];
  }

  private transformarPersona(
    item: PersonalApiItem
  ): PersonalEstructura | null {
    const nombres = String(
      item?.nombres || item?.nombre || ''
    ).trim();

    const denominacionPuesto = String(
      item?.denominacion_puesto || item?.cargo || ''
    ).trim();

    if (!nombres || !denominacionPuesto) {
      return null;
    }

    return {
      id: item?.id,
      nombres,
      provincia: String(item?.provincia || '').trim(),
      canton: String(item?.canton || '').trim(),
      denominacion_puesto: denominacionPuesto,
      unidad_organica: String(
        item?.unidad_organica || item?.unidad || ''
      ).trim()
    };
  }

  private ordenarYDepurarPersonas(
    personas: readonly PersonalEstructura[]
  ): PersonalEstructura[] {
    const unicos = new Map<string, PersonalEstructura>();

    for (const persona of personas) {
      const clave = this.normalizarTexto(persona.nombres);

      if (clave && !unicos.has(clave)) {
        unicos.set(clave, { ...persona });
      }
    }

    return [...unicos.values()].sort((a, b) =>
      a.nombres.localeCompare(b.nombres, 'es', {
        sensitivity: 'base'
      })
    );
  }

  private ordenarYDepurarAutoridades(
    autoridades: readonly Autoridad[]
  ): Autoridad[] {
    const unicas = new Map<string, Autoridad>();

    for (const autoridad of autoridades) {
      const clave = this.normalizarTexto(autoridad.nombres);

      if (clave && !unicas.has(clave)) {
        unicas.set(clave, { ...autoridad });
      }
    }

    return [...unicas.values()].sort((a, b) =>
      a.nombres.localeCompare(b.nombres, 'es', {
        sensitivity: 'base'
      })
    );
  }

  private obtenerAutoridadesLocales(): Autoridad[] {
    const autoridades = this.estructuraPersonalBase
      .filter((persona) =>
        this.normalizarTexto(persona.denominacion_puesto).includes(
          'DIRECTOR'
        )
      )
      .map<Autoridad>((persona) => ({
        nombres: persona.nombres,
        denominacion_puesto: persona.denominacion_puesto,
        unidad_organica: persona.unidad_organica
      }));

    return this.ordenarYDepurarAutoridades(autoridades);
  }

  private limpiarInputCertificado(): void {
    const input = document.getElementById(
      'archivo_p12'
    ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }
  }

  private async mostrarErrorHttp(
    titulo: string,
    error: HttpErrorResponse,
    mensajePredeterminado: string
  ): Promise<void> {
    const mensaje = await this.extraerMensajeError(
      error,
      mensajePredeterminado
    );

    await Swal.fire(titulo, mensaje, 'error');
  }

  private async extraerMensajeError(
    error: HttpErrorResponse,
    mensajePredeterminado: string
  ): Promise<string> {
    const cuerpo = error?.error;

    if (cuerpo instanceof Blob) {
      try {
        const texto = await cuerpo.text();

        try {
          const json = JSON.parse(texto) as {
            error?: string;
            message?: string;
            mensaje?: string;
          };

          return (
            json.error ||
            json.message ||
            json.mensaje ||
            mensajePredeterminado
          );
        } catch {
          return texto.trim() || mensajePredeterminado;
        }
      } catch {
        return mensajePredeterminado;
      }
    }

    if (typeof cuerpo === 'string') {
      return cuerpo.trim() || mensajePredeterminado;
    }

    if (cuerpo && typeof cuerpo === 'object') {
      const respuesta = cuerpo as {
        error?: string;
        message?: string;
        mensaje?: string;
      };

      return (
        respuesta.error ||
        respuesta.message ||
        respuesta.mensaje ||
        mensajePredeterminado
      );
    }

    return error?.message || mensajePredeterminado;
  }

  // ==========================================
  // FLUJO DE FIRMAS ELECTRÓNICAS MÚLTIPLES
  // ==========================================

  async guardarBorrador(mostrarExito = false): Promise<void> {
    if (!this.formulario.numero_accion || !this.formulario.cedula) {
      void Swal.fire('Atención', 'Complete la cédula y número de acción', 'warning');
      throw new Error('Validación fallida');
    }
    
    try {
      this.firmando = true;
      this.cdr.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const res = await firstValueFrom(this.http.post<{ doc_id: number; mensaje: string }>(
        this.endpoints.guardarBorrador, 
        this.formulario,
        { headers: this.getHeaders() }
      ));
      
      if (res?.doc_id) {
        this.documentoActualId = res.doc_id;
        if (mostrarExito) {
          void Swal.fire('Éxito', 'Borrador guardado correctamente', 'success');
        }
      }
    } catch (e: any) {
      const errorMsg = await this.extraerMensajeError(e, '');
      if (errorMsg.includes('ya no está en borrador') || errorMsg.includes('PENDIENTE_FIRMAS')) {
        // Ignorar si ya existe en este estado para ESTE mismo documento
        throw new Error('PENDIENTE_FIRMAS');
      } else {
        void this.mostrarErrorHttp('Error', e, 'No se pudo guardar el borrador');
        throw e;
      }
    } finally {
      this.firmando = false;
      this.cdr.detectChanges();
    }
  }

  async prepararDocumentoParaFirmas(): Promise<void> {
    if (this.preparandoDocumento) return;

    try {
      this.preparandoDocumento = true;
      this.cdr.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));

      if (!this.documentoActualId) {
        try {
          await this.guardarBorrador();
        } catch (e: any) {
          if (e.message !== 'PENDIENTE_FIRMAS') throw e;
          
          if (this.documentoActualId) {
              return this.toggleOffcanvasFirmas();
          } else {
              throw new Error('El número de acción ingresado ya le pertenece a un documento bloqueado/firmado. Por favor, asigne un número de acción diferente para este nuevo funcionario.');
          }
        }
      }

      if (this.documentoActualId) {
        try {
          await firstValueFrom(this.http.post(
            this.endpoints.prepararFirmas(this.documentoActualId), 
            {},
            { headers: this.getHeaders() }
          ));
        } catch (e: any) {
          const msg = await this.extraerMensajeError(e, '');
          if (msg.includes('ya no está en borrador') || msg.includes('PENDIENTE_FIRMAS')) {
             void Swal.fire({
                 title: 'Documento bloqueado',
                 text: 'Esta acción de personal ya fue enviada a firmas o ya está firmada y no puede modificarse. Si desea crear una nueva acción de personal (por ejemplo, para otro empleado), presione el botón "Limpiar" en la parte superior.',
                 icon: 'warning'
             });
             return;
          }
          
          void this.mostrarErrorHttp('Error', e, 'No se pudo preparar el documento para firmas');
          return;
        }
        
        await this.cargarFirmasDocumento();
        void Swal.fire('Éxito', 'Documento listo para firmar', 'success');
        this.mostrarOffcanvasFirmas = true;
      }
    } finally {
      this.preparandoDocumento = false;
      this.cdr.detectChanges();
    }
  }

  async cargarFirmasDocumento(): Promise<void> {
    if (!this.documentoActualId) return;
    
    try {
      this.cargandoFirmas = true;
      this.cdr.detectChanges();
      
      const firmas = await firstValueFrom(this.http.get<FirmaDocumento[]>(
        this.endpoints.listarFirmas(this.documentoActualId),
        { headers: this.getHeaders() }
      ));
      
      this.firmasDocumento = firmas || [];
    } catch (e: any) {
      void this.mostrarErrorHttp('Error', e, 'No se pudieron cargar las firmas');
    } finally {
      this.cargandoFirmas = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalFirma(firma: FirmaDocumento): void {
    if (firma.estado === 'FIRMADA') return;
    this.firmaSeleccionada = firma;
    this.mostrarModalFirma = true;
    this.passwordFirmaSeccion = '';
    this.selectedFile = null;
    this.limpiarInputCertificado();
    this.cdr.detectChanges(); // Forzar actualización de UI para mostrar el modal
  }

  cerrarModalFirma(): void {
    this.mostrarModalFirma = false;
    this.firmaSeleccionada = null;
    this.passwordFirmaSeccion = '';
    this.selectedFile = null;
    this.limpiarInputCertificado();
    this.cdr.detectChanges(); // Forzar actualización de UI para ocultar el modal
  }

  toggleOffcanvasFirmas(): void {
    this.mostrarOffcanvasFirmas = !this.mostrarOffcanvasFirmas;
    this.cdr.detectChanges();
  }

  seleccionarCertificadoFirma(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.selectedFile = null;
      this.cdr.markForCheck();
      return;
    }

    if (!archivo.name.toLowerCase().endsWith('.p12') && !archivo.name.toLowerCase().endsWith('.pfx')) {
      input.value = '';
      this.selectedFile = null;
      void Swal.fire('Archivo no válido', 'Seleccione un certificado .p12 o .pfx', 'warning');
      return;
    }
    
    this.selectedFile = archivo;
    this.cdr.markForCheck();
  }

  async firmarSeccion(): Promise<void> {
    if (!this.documentoActualId || !this.firmaSeleccionada || !this.selectedFile || !this.passwordFirmaSeccion || this.firmando) return;
    
    try {
      this.firmando = true;
      this.cdr.detectChanges(); // Forzamos actualización de la UI inmediatamente para deshabilitar botón
      
      // Liberar el Main Thread brevemente para evitar bloqueos del navegador (UI freeze)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const formData = new FormData();
      formData.append('certificado', this.selectedFile);
      formData.append('password', this.passwordFirmaSeccion);
      formData.append('seccion', this.firmaSeleccionada.seccion);
      
      await firstValueFrom(this.http.post(
        this.endpoints.firmarSeccion(this.documentoActualId), 
        formData,
        { headers: this.getHeaders() }
      ));
      
      void Swal.fire('Firma exitosa', `Se firmó la sección ${this.firmaSeleccionada.seccion}`, 'success');
      this.cerrarModalFirma();
      await this.cargarFirmasDocumento();
    } catch (e: any) {
      void this.mostrarErrorHttp('Error al firmar', e, 'Contraseña incorrecta o certificado inválido');
    } finally {
      this.firmando = false;
      this.cdr.detectChanges();
    }
  }

  async finalizarDocumento(): Promise<void> {
    if (!this.documentoActualId) return;
    try {
      await firstValueFrom(this.http.post(
        this.endpoints.finalizarDocumento(this.documentoActualId), 
        {},
        { headers: this.getHeaders() }
      ));
      
      void Swal.fire('Documento finalizado', 'Todas las firmas se han completado', 'success');
    } catch (e: any) {
      void this.mostrarErrorHttp('Error', e, 'Aún faltan firmas obligatorias');
    }
  }

  async descargarPdfFirmado(): Promise<void> {
    if (!this.documentoActualId) return;
    
    try {
      this.descargandoPdf = true;
      this.cdr.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const blob = await firstValueFrom(this.http.get(
        this.endpoints.descargarPdf(this.documentoActualId),
        { 
          headers: this.getHeaders(),
          responseType: 'blob'
        }
      ));
      
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `accion_personal_${this.formulario.cedula}_${this.documentoActualId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      void this.mostrarErrorHttp('Error', e, 'No se pudo descargar el PDF');
    } finally {
      this.descargandoPdf = false;
      this.cdr.detectChanges();
    }
  }
}
