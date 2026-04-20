import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.html',
  styleUrls: ['./auditoria.scss']
})
export class AuditoriaComponent implements OnInit {

  private readonly API_URL = 'http://localhost:5000/api/auditoria';

  auditoria: any[] = [];
  auditoriaFiltrada: any[] = [];

  searchText: string = '';
  usuarioFiltro: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';

  cargando: boolean = false;
  expandedId: number | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerAuditoria();
  }

  getHeaders() {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  obtenerAuditoria() {
    this.cargando = true;

    this.http.get<any[]>(this.API_URL, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const datos = Array.isArray(response) ? response : [];

        this.auditoria = [...datos];
        this.aplicarFiltros();
        this.cargando = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al obtener auditoría:', err);

        Swal.fire(
          'Error',
          err?.error?.error || 'No se pudo cargar la auditoría',
          'error'
        );

        this.cdr.detectChanges();
      }
    });
  }

  buscar() {
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const texto = this.normalizar(this.searchText);
    const usuario = this.normalizar(this.usuarioFiltro);
    const desde = this.fechaDesde?.trim() || '';
    const hasta = this.fechaHasta?.trim() || '';

    this.auditoriaFiltrada = this.auditoria.filter(item => {
      const usuarioItem = this.normalizar(item.usuario);
      const accion = this.normalizar(item.accion);
      const tabla = this.normalizar(item.tabla_afectada);
      const registroId = this.normalizar(item.registro_id);
      const fecha = this.normalizar(item.fecha);
      const detalle = this.normalizar(item.detalle);
      const ip = this.normalizar(item.ip_usuario);
      const datosAnteriores = this.normalizar(item.datos_anteriores);
      const datosNuevos = this.normalizar(item.datos_nuevos);

      const coincideBusqueda = !texto || (
        usuarioItem.includes(texto) ||
        accion.includes(texto) ||
        tabla.includes(texto) ||
        registroId.includes(texto) ||
        fecha.includes(texto) ||
        detalle.includes(texto) ||
        ip.includes(texto) ||
        datosAnteriores.includes(texto) ||
        datosNuevos.includes(texto)
      );

      const coincideUsuario = !usuario || usuarioItem.includes(usuario);

      const fechaItem = this.obtenerSoloFecha(item.fecha);

      const coincideDesde = !desde || (fechaItem !== '' && fechaItem >= desde);
      const coincideHasta = !hasta || (fechaItem !== '' && fechaItem <= hasta);

      return coincideBusqueda && coincideUsuario && coincideDesde && coincideHasta;
    });

    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.searchText = '';
    this.usuarioFiltro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.aplicarFiltros();
  }

  obtenerUsuariosUnicos(): string[] {
    const usuarios = this.auditoria
      .map(item => item?.usuario?.toString().trim())
      .filter((u): u is string => !!u);

    return [...new Set(usuarios)].sort((a, b) => a.localeCompare(b));
  }

  normalizar(valor: any): string {
    return (valor ?? '').toString().toLowerCase().trim();
  }

  traducirAccion(accion: string): string {
    switch (accion?.toUpperCase()) {
      case 'CREATE':
        return 'CREACIÓN';
      case 'UPDATE':
        return 'ACTUALIZACIÓN';
      case 'DELETE':
        return 'ELIMINACIÓN';
      case 'LOGIN':
        return 'INICIO DE SESIÓN';
      default:
        return accion || 'SIN ACCIÓN';
    }
  }

  obtenerClaseAccion(accion: string): string {
    switch (accion?.toUpperCase()) {
      case 'CREATE':
        return 'create';
      case 'UPDATE':
        return 'update';
      case 'DELETE':
        return 'delete';
      case 'LOGIN':
        return 'login';
      default:
        return 'default';
    }
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'Sin fecha';

    const texto = String(fecha).trim();

    if (texto.includes(' ') && texto.includes('-')) {
      const partes = texto.split(' ');
      if (partes.length === 2) {
        const [fechaParte, horaParte] = partes;
        const [anio, mes, dia] = fechaParte.split('-');
        return `${dia}/${mes}/${anio} ${horaParte}`;
      }
    }

    return texto;
  }

  obtenerSoloFecha(fecha: any): string {
    if (!fecha) return '';

    const texto = String(fecha).trim();

    if (texto.includes(' ')) {
      return texto.split(' ')[0];
    }

    if (texto.includes('T')) {
      return texto.split('T')[0];
    }

    return texto.length >= 10 ? texto.substring(0, 10) : texto;
  }

  toggleDetalle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  formatearCampo(campo: string): string {
    const etiquetas: Record<string, string> = {
      id: 'ID',
      nro: 'Número',
      cedula: 'Cédula',
      nombres: 'Nombres',
      modalidad: 'Modalidad',
      cargo: 'Cargo',
      rmu: 'RMU',
      unidad: 'Unidad',
      fecha_ingreso: 'Fecha de Ingreso',
      fecha_nacimiento: 'Fecha de Nacimiento',
      direccion: 'Dirección',
      email_inst: 'Correo Institucional',
      telefono: 'Teléfono',
      genero: 'Género',
      instruccion: 'Instrucción',
      profesion: 'Profesión',
      vulnerable: 'Vulnerable',
      tipo_discapacidad: 'Tipo de Discapacidad',
      porcentaje_disc: 'Porcentaje de Discapacidad',
      etnia: 'Etnia',
      observaciones: 'Observaciones',
      rol: 'Rol',
      detalle: 'Detalle',
      ip_usuario: 'IP del Usuario',
      tabla_afectada: 'Tabla Afectada',
      registro_id: 'ID del Registro'
    };

    return etiquetas[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  valorBonito(valor: any): string {
    if (valor === null || valor === undefined || valor === '') return '—';

    if (typeof valor === 'object') {
      try {
        return JSON.stringify(valor, null, 2);
      } catch {
        return String(valor);
      }
    }

    return String(valor);
  }

  parseCambios(antes: any, despues: any): any[] {
    let objAntes: any = {};
    let objDespues: any = {};

    try {
      objAntes = antes ? JSON.parse(antes) : {};
    } catch {
      objAntes = {};
    }

    try {
      objDespues = despues ? JSON.parse(despues) : {};
    } catch {
      objDespues = {};
    }

    const cambios: any[] = [];
    const keys = new Set([
      ...Object.keys(objAntes || {}),
      ...Object.keys(objDespues || {})
    ]);

    keys.forEach((key) => {
      const valorAntes = objAntes?.[key];
      const valorDespues = objDespues?.[key];

      if (JSON.stringify(valorAntes) !== JSON.stringify(valorDespues)) {
        cambios.push({
          campo: this.formatearCampo(key),
          antes: this.valorBonito(valorAntes),
          despues: this.valorBonito(valorDespues)
        });
      }
    });

    return cambios;
  }

  exportarExcel() {
    const data = this.auditoriaFiltrada.map(item => ({
      ID: item.id,
      Usuario: item.usuario,
      Accion: this.traducirAccion(item.accion),
      Tabla_Afectada: item.tabla_afectada,
      Registro_ID: item.registro_id || '',
      Detalle: item.detalle || '',
      IP_Usuario: item.ip_usuario || '',
      Fecha: this.formatearFecha(item.fecha)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, 'auditoria.xlsx');
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }
}