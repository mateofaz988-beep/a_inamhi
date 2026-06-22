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

export interface ApiError {
  error: string;
}
