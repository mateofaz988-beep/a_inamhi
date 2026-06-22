import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-solicitud-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-permisos.html',
  styleUrls: ['./solicitud-permisos.scss']
})
export class SolicitudPermisosComponent implements OnInit {

  private readonly API_URL             = 'http://localhost:5000/api/personal/cedula';
  private readonly ESTRUCTURA_API_URL  = 'http://localhost:5000/api/personal-estructura';
  private readonly AUTORIDADES_API_URL = 'http://localhost:5000/api/autoridades';

  consultando    = false;
  generandoExcel = false;
  mostrarPrevia  = false;

  estructuraPersonal: Array<{
    id?: number;
    nombres: string;
    provincia?: string;
    canton?: string;
    denominacion_puesto: string;
    unidad_organica?: string;
  }> = [];

  listaAutoridades: Array<{
    nombres: string;
    denominacion_puesto: string;
    unidad_organica?: string;
  }> = [];

  private readonly estructuraPersonalBase = [
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

  tiposPermiso: string[] = ['Vacaciones', 'Licencia', 'Permiso'];

  gruposOcupacionales: string[] = [
    'SERVIDOR PÚBLICO DE APOYO 1',
    'SERVIDOR PÚBLICO DE APOYO 2',
    'SERVIDOR PÚBLICO DE APOYO 3',
    'SERVIDOR PÚBLICO DE APOYO 4',
    'SERVIDOR PÚBLICO 1',
    'SERVIDOR PÚBLICO 2',
    'SERVIDOR PÚBLICO 3',
    'SERVIDOR PÚBLICO 4',
    'NIVEL JERÁRQUICO SUPERIOR 2'
  ];

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

  unidadesInstitucionales = [
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA ESMERALDAS - MIRA',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se establece su competencia para la ejecución técnica y operativa de la red de observación en la zona norte del país.'
    },
    {
      nombre: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS',
      baseLegal: 'De conformidad con la Ley Orgánica de Servicio Público (LOSEP) y su Reglamento, se dispone la administración integral del talento humano, procesos de selección, capacitación y regímenes remunerativos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA MORONA SANTIAGO',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se faculta el monitoreo hidrometeorológico de la región amazónica sur para la prevención de eventos adversos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA NAPO',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se asigna la gestión operativa y técnica de las estaciones meteorológicas en la zona centro-norte de la Amazonía.'
    },
    {
      nombre: 'DIRECCIÓN DE PRONÓSTICOS Y ALERTAS HIDROMETEOROLÓGICAS',
      baseLegal: 'De conformidad con la Ley de Meteorología e Hidrología y su Reglamento, se establece la responsabilidad de vigilancia atmosférica, generación de alertas tempranas y seguridad meteorológica aérea.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA JUBONES - PUYANGO',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se dictamina el control técnico de la red hidrometeorológica en las cuencas del sur occidente del territorio ecuatoriano.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA PASTAZA',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se establece la supervisión y mantenimiento preventivo de la red de estaciones en la zona central amazónica.'
    },
    {
      nombre: 'DIRECCIÓN DE ESTUDIOS, INVESTIGACIÓN Y DESARROLLO HIDROMETEOROLÓGICO',
      baseLegal: 'De conformidad con el Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación, se dispone la generación de modelos científicos y estudios de adaptación al cambio climático.'
    },
    {
      nombre: 'DIRECCIÓN DE LABORATORIO DE AGUAS Y SEDIMENTOS',
      baseLegal: 'De conformidad con las normas técnicas de calidad ISO/IEC 17025, se autoriza la ejecución de ensayos físicos y químicos para la determinación de la calidad del recurso hídrico y sedimentos.'
    },
    {
      nombre: 'DIRECCIÓN DE ASESORÍA JURÍDICA',
      baseLegal: 'De conformidad con el Código Orgánico Administrativo (COA), se establece la función de patrocinio legal, control de legalidad de los actos administrativos y suscripción de convenios institucionales.'
    },
    {
      nombre: 'DIRECCIÓN DE LA RED NACIONAL DE OBSERVACIÓN HIDROMETEOROLÓGICA',
      baseLegal: 'De conformidad con el Plan Nacional de Gestión de Riesgos, se faculta la planificación, instalación y operatividad de la infraestructura de estaciones automáticas y convencionales a nivel nacional.'
    },
    {
      nombre: 'DIRECCIÓN ADMINISTRATIVA FINANCIERA',
      baseLegal: 'De conformidad con el Código Orgánico de Planificación y Finanzas Públicas, se dispone la gestión presupuestaria, contable y los procesos de contratación pública bajo la normativa del SERCOP.'
    },
    {
      nombre: 'DIRECCIÓN DE INFORMACIÓN HIDROMETEOROLÓGICA',
      baseLegal: 'De conformidad con la Ley Orgánica de Transparencia y Acceso a la Información Pública (LOTAIP), se asigna la administración del Banco Nacional de Datos y la validación de información histórica.'
    },
    {
      nombre: 'DIRECCIÓN DE PLANIFICACIÓN',
      baseLegal: 'De conformidad con la normativa de optimización y eficiencia del Estado, se establece la elaboración del Plan Estratégico Institucional (PEI) y el seguimiento de indicadores de gestión y resultados.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA GUAYAS - GALÁPAGOS',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se determina el monitoreo climático marino-costero y de la región insular para el seguimiento de eventos oceánicos.'
    },
    {
      nombre: 'DIRECCIÓN REGIONAL TÉCNICA HIDROMETEOROLÓGICA MANABÍ',
      baseLegal: 'De conformidad con el Estatuto Orgánico de Gestión Organizacional por Procesos del INAMHI, se faculta asegurar la operatividad técnica y recolección de datos climáticos en la zona costera central.'
    },
    {
      nombre: 'DIRECCIÓN DE COMUNICACIÓN SOCIAL',
      baseLegal: 'De conformidad con la Ley Orgánica de Comunicación, se dispone el manejo de la imagen institucional y la difusión oficial de avisos meteorológicos y alertas a la ciudadanía.'
    },
    {
      nombre: 'DIRECCIÓN EJECUTIVA',
      baseLegal: 'De conformidad con el Decreto Ejecutivo de creación del INAMHI, se establece la dirección superior, representación legal y la articulación estratégica con organismos nacionales e internacionales.'
    }
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

    numero_accion: `AP-RH-${new Date().getFullYear()}-`,
    fecha_elaboracion: this.obtenerFechaActual(),
    desde: this.obtenerFechaActual(),
    hasta: this.obtenerFechaActual(),
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
    uso_exclusivo_th: '',
    fecha_impresion: this.obtenerFechaActual()
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarEstructuraPersonal();
    this.cargarAutoridades();
  }

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
    const texto = String(fecha).trim();

    if (texto.includes('T')) {
      return texto.split('T')[0].split('-').reverse().join('/');
    }

    if (texto.includes(' ') && texto.includes('-')) {
      const fechaParte = texto.split(' ')[0];
      return fechaParte.split('-').reverse().join('/');
    }

    const partes = texto.split('-');
    if (partes.length !== 3) return texto;

    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  }

  formatearFechaHoraVisual(fecha: string): string {
    if (!fecha) return '';
    if (String(fecha).includes(' ')) return String(fecha);
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

  normalizarTexto(valor: string): string {
    return (valor || '')
      .toString()
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  buscarUnidadInstitucional(nombreUnidad: string) {
    const unidadNormalizada = this.normalizarTexto(nombreUnidad);

    return this.unidadesInstitucionales.find(u =>
      this.normalizarTexto(u.nombre) === unidadNormalizada
    );
  }

  onUnidadChange() {
    const unidad = this.buscarUnidadInstitucional(this.formulario.unidad);

    if (unidad) {
      this.formulario.unidad = unidad.nombre;
      this.formulario.unidad_actual = unidad.nombre;
      this.formulario.unidad_propuesta = unidad.nombre;
      this.formulario.motivo_legal = unidad.baseLegal;
    }
  }

  aplicarBaseLegalPorUnidad(unidadNombre: string) {
    const unidad = this.buscarUnidadInstitucional(unidadNombre);
    const nombre = unidad ? unidad.nombre : (unidadNombre || '');

    this.formulario.unidad          = nombre;
    this.formulario.unidad_actual   = nombre;
    this.formulario.unidad_propuesta = nombre;

    if (unidad) {
      this.formulario.motivo_legal = unidad.baseLegal;
    }
  }

  cargarEstructuraPersonal() {
    this.estructuraPersonal = [...this.estructuraPersonalBase];

    this.http.get<any>(this.ESTRUCTURA_API_URL, {
      headers: this.getHeaders()
    }).subscribe({
      next: (resp) => {
        const registros = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : [];

        if (!registros.length) return;

        this.estructuraPersonal = registros
          .map((item: any) => ({
            id: item.id,
            nombres: item.nombres || item.nombre || '',
            provincia: item.provincia || '',
            canton: item.canton || '',
            denominacion_puesto: item.denominacion_puesto || item.cargo || '',
            unidad_organica: item.unidad_organica || item.unidad || ''
          }))
          .filter((item: any) => item.nombres && item.denominacion_puesto)
          .sort((a: any, b: any) => a.nombres.localeCompare(b.nombres));
      },
      error: (err) => {
        console.warn('No se pudo cargar personal_estructura desde la API. Se usará lista local.', err);
      }
    });
  }

  cargarAutoridades() {
    this.http.get<any>(this.AUTORIDADES_API_URL, {
      headers: this.getHeaders()
    }).subscribe({
      next: (resp) => {
        const registros = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : []);
        this.listaAutoridades = registros
          .filter((item: any) => item.nombres && item.denominacion_puesto)
          .map((item: any) => ({
            nombres: item.nombres,
            denominacion_puesto: item.denominacion_puesto,
            unidad_organica: item.unidad_organica || ''
          }));
      },
      error: (err) => {
        console.warn('No se pudo cargar autoridades desde la API.', err);
      }
    });
  }

  buscarPersonaEstructura(nombre: string) {
    const nombreNormalizado = this.normalizarTexto(nombre);

    return this.estructuraPersonal.find(persona =>
      this.normalizarTexto(persona.nombres) === nombreNormalizado
    );
  }

  seleccionarResponsable(campoNombre: string, campoPuesto: string, nombre: string) {
    const nombreN = this.normalizarTexto(nombre);
    const persona = this.buscarPersonaEstructura(nombre)
      ?? this.listaAutoridades.find(a => this.normalizarTexto(a.nombres) === nombreN);

    this.formulario[campoNombre] = nombre || '';
    this.formulario[campoPuesto] = persona?.denominacion_puesto || '';

    this.cdr.detectChanges();
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
        const rmu = data.rmu != null ? String(data.rmu) : '';
        const ciudad = this.formulario.ciudad || 'Quito';
        const grupo = data.grupo_ocupacional || '';
        // La DB guarda rol como GOBERNANTE/SUSTANTIVO/ADJETIVO
        const proceso = (data.rol || '').toUpperCase();

        this.aplicarBaseLegalPorUnidad(data.unidad || '');

        this.formulario = {
          ...this.formulario,
          cedula:           data.cedula || this.formulario.cedula,
          apellidos:        separado.apellidos,
          nombres:          separado.nombres,
          nombres_completos: data.nombres || '',
          regimen_laboral:  data.modalidad || '',
          cargo:            data.cargo || '',
          rmu,
          grupo_ocupacional: grupo,
          proceso_institucional_actual:   proceso,
          proceso_institucional_propuesta: proceso,
          lugar_trabajo_actual:    ciudad,
          lugar_trabajo_propuesta: ciudad,
          denominacion_actual:    data.cargo || '',
          denominacion_propuesta: data.cargo || '',
          remuneracion_actual:    rmu,
          remuneracion_propuesta: rmu,
          aceptacion_servidor: data.nombres || '',
          elaborado_por:   this.formulario.elaborado_por || data.nombres || '',
          solicitado_por:  data.nombres || '',
          puesto_solicitante: data.cargo || '',
          impreso_por:     data.nombres || '',
          observacion: this.formulario.observacion?.trim()
            ? this.formulario.observacion
            : this.formulario.tipo_permiso,
        };

        this.cdr.detectChanges();

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

      numero_accion: `AP-RH-${new Date().getFullYear()}-`,
      fecha_elaboracion: this.obtenerFechaActual(),
      desde: this.obtenerFechaActual(),
      hasta: this.obtenerFechaActual(),
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
      uso_exclusivo_th: '',
      fecha_impresion: this.obtenerFechaActual()
    };
  }

  generarExcel() {
    if (!this.formulario.cedula?.trim() || !this.formulario.apellidos?.trim()) {
      Swal.fire('Atención', 'Consulte primero la cédula del funcionario para cargar sus datos', 'warning');
      return;
    }
    if (!this.formulario.desde?.trim()) {
      Swal.fire('Atención', 'Ingrese la "Fecha Rige Desde" en la sección Acción Personal y Vigencia', 'warning');
      return;
    }
    this.mostrarPrevia = true;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  ejecutarDescargaExcel() {
    this.generandoExcel = true;

    const f = this.formulario;

    const payload = {
      // ── ENCABEZADO (M3, K5, C50)
      numero_accion:     f.numero_accion    || '',
      fecha_elaboracion: f.fecha_elaboracion || '',
      ciudad:            f.ciudad           || 'Quito',

      // ── FUNCIONARIO (A6, I6, E11)
      apellidos:         f.apellidos        || '',
      nombres:           f.nombres          || '',
      cedula:            f.cedula           || '',
      regimen_laboral:   f.regimen_laboral  || '',
      cargo:             f.cargo            || '',
      rmu:               f.rmu              || '',

      // ── ACCIÓN Y VIGENCIA (checkboxes, I11, M11)
      tipo_accion:       (f.accion_personal || '').toUpperCase(),
      fecha_rige_desde:  f.desde            || '',
      fecha_rige_hasta:  f.hasta            || '',

      // ── SITUACIÓN ACTUAL (B28, B30, B32, B34, B36, B38, B44)
      proceso_institucional_actual:    f.proceso_institucional_actual || '',
      nivel_gestion_actual:            f.nivel_gestion_actual         || '',
      unidad_administrativa:           f.unidad                       || '',
      lugar_trabajo_actual:            f.lugar_trabajo_actual         || f.ciudad || '',
      denominacion_actual:             f.denominacion_actual          || f.cargo  || '',
      grupo_ocupacional:               f.grupo_ocupacional            || '',
      partida_actual:                  f.partida_actual               || '',

      // ── SITUACIÓN PROPUESTA (J28, J30, J32, J34, J36, J38, J44)
      proceso_institucional_propuesta: f.proceso_institucional_propuesta || f.proceso_institucional_actual || '',
      nivel_gestion_propuesta:         f.nivel_gestion_propuesta         || f.nivel_gestion_actual         || '',
      unidad_administrativa_propuesta: f.unidad_propuesta              || f.unidad || '',
      lugar_trabajo_propuesta:         f.lugar_trabajo_propuesta       || f.lugar_trabajo_actual || '',
      denominacion_propuesta:          f.denominacion_propuesta        || f.denominacion_actual  || '',
      partida_propuesta:               f.partida_propuesta             || f.partida_actual        || '',

      // ── MOTIVACIÓN / BASE LEGAL (A24)
      motivo_legal: f.motivo_legal || '',

      // ── RESPONSABLES DE APROBACIÓN (C61/C62, K61/K62)
      nombre_director_th: f.nombre_director_th || '',
      puesto_director_th: f.puesto_director_th  || '',
      nombre_autoridad:   f.nombre_autoridad    || '',
      puesto_autoridad:   f.puesto_autoridad    || '',

      // ── ACEPTACIÓN SERVIDOR (C74, C75)
      aceptacion_servidor: f.aceptacion_servidor || (f.apellidos && f.nombres ? `${f.apellidos} ${f.nombres}` : ''),
      fecha_aceptacion:    f.fecha_aceptacion    || f.fecha_elaboracion || '',

      // ── ELABORACIÓN/REVISIÓN/REGISTRO (C87/C88, G87/G88, M87/M88)
      elaborado_por:    f.elaborado_por    || '',
      puesto_elaborado: f.puesto_elaborado || '',
      revisado_por:     f.revisado_por     || '',
      puesto_revisado:  f.puesto_revisado  || '',
      registrado_por:   f.registrado_por   || '',
      puesto_registrado: f.puesto_registrado || '',
    };

    this.http.post('http://localhost:5000/api/generar-accion', payload, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        this.generandoExcel = false;
        this.mostrarPrevia  = false;
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `AP_${this.formulario.apellidos || 'Documento'}_${this.formulario.cedula || ''}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        Swal.fire({ icon: 'success', title: '¡Descargado!', text: 'El Excel se generó correctamente', timer: 1800, showConfirmButton: false });
      },
      error: (err) => {
        this.generandoExcel = false;
        const errorBody = err?.error;
        if (errorBody instanceof Blob) {
          errorBody.text().then(text => {
            try {
              const parsed = JSON.parse(text);
              Swal.fire('Error', parsed?.error || 'No se pudo generar el documento Excel', 'error');
            } catch {
              Swal.fire('Error', 'No se pudo generar el documento Excel', 'error');
            }
          });
        } else {
          Swal.fire('Error', errorBody?.error || err?.message || 'No se pudo generar el documento Excel', 'error');
        }
      }
    });
  }
}