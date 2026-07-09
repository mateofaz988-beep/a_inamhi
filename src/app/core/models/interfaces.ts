// =========================
// MODELOS DE DATOS
// =========================

export interface LoginRequest {
  user: string;
  pass: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  usuario: string;
}

export interface Funcionario {
  id?: number;
  nro: string;
  cedula: string;
  nombres: string;
  modalidad: string;
  cargo: string;
  rmu: number | string;
  unidad: string;
  fecha_ingreso: string | null;
  fecha_nacimiento: string | null;
  direccion: string;
  email_inst: string;
  telefono: string;
  genero: string;
  instruccion: string;
  profesion: string;
  vulnerable: string;
  tipo_discapacidad: string;
  porcentaje_disc: number | string;
  etnia: string;
  rol?: string;
  observaciones: string;
}

export interface FuncionarioPasivo extends Funcionario {
  id_personal: number;
  fecha_salida: string;
  motivo_salida: string;
  usuario_responsable: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  usuario: string;
  accion: string;
  tabla_afectada: string;
  registro_id: number | null;
  datos_anteriores: string | null;
  datos_nuevos: string | null;
  detalle: string;
  ip_usuario: string;
  fecha: string;
}

export interface Usuario {
  id: number;
  usuario: string;
  rol: string;
}

export interface Autoridad {
  id: number;
  nombres: string;
  provincia: string;
  canton: string;
  denominacion_puesto: string;
  unidad_organica: string;
}

export interface PersonalEstructura {
  id: number;
  nombres: string;
  provincia: string;
  canton: string;
  denominacion_puesto: string;
  unidad_organica: string;
}

export interface HistorialAccion {
  id: number;
  cedula: string;
  nombres: string;
  numero_accion: string;
  tipo_accion: string;
  fecha_accion: string;
  fecha_registro: string;
  archivo_nombre: string | null;
  registrado_por: string;
}

export interface BaseLegalItem {
  id: number;
  tipo_movimiento: string;
  base_legal: string;
  activo: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface FormularioAccionPersonal {
  numero_accion: string;
  fecha_elaboracion: string;
  apellidos: string;
  nombres: string;
  cedula: string;
  desde: string;
  hasta: string;
  accion_personal: string;
  motivo_legal: string;
  proceso_institucional_actual: string;
  nivel_gestion_actual: string;
  unidad: string;
  lugar_trabajo_actual: string;
  denominacion_actual: string;
  grupo_ocupacional: string;
  partida_actual: string;
  nivel_gestion_propuesta?: string;
  proceso_institucional_propuesta?: string;
  unidad_propuesta?: string;
  lugar_trabajo_propuesta?: string;
  denominacion_propuesta?: string;
  partida_propuesta?: string;
  nombre_posesion?: string;
  ciudad: string;
  aceptacion_servidor?: string;
  fecha_aceptacion?: string;
  nombre_director_th?: string;
  puesto_director_th?: string;
  nombre_autoridad?: string;
  puesto_autoridad?: string;
  elaborado_por?: string;
  puesto_elaborado?: string;
  revisado_por?: string;
  puesto_revisado?: string;
  registrado_por?: string;
  puesto_registrado?: string;
  [key: string]: any;
}

export interface ApiError {
  error: string;
}
