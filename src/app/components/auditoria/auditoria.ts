import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import Swal from "sweetalert2";

import { AuthService } from "../../core/services/auth";

interface AuditoriaItem {
  id: number;
  usuario: string;
  accion: string;
  tabla_afectada: string;
  registro_id: number | null;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  detalle: string | null;
  ip_usuario: string | null;
  fecha: string;
  user_agent?: string | null;
  endpoint?: string | null;
  metodo_http?: string | null;
  estado?: string | null;
  codigo_http?: number | null;
  metadata?: unknown;
}

interface CambioAuditoria {
  campo: string;
  antes: string;
  despues: string;
}

interface ResumenAuditoria {
  total: number;
  hoy: number;
  actualizaciones: number;
  firmas: number;
  errores: number;
}

interface CatalogosAuditoria {
  acciones: string[];
  tablas: string[];
  usuarios: string[];
}

interface AuditoriaApiResponse {
  items?: AuditoriaItem[];
  data?: AuditoriaItem[];
  total?: number;
  pagina?: number;
  paginas?: number;
  limite?: number;
  ultimo_id?: number;
  resumen?: Partial<ResumenAuditoria>;
}

type EstadoTiempoReal =
  "conectando" | "conectado" | "reconectando" | "pausado" | "error";

@Component({
  selector: "app-auditoria",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./auditoria.html",
  styleUrls: ["./auditoria.scss"],
})
export class AuditoriaComponent implements OnInit, OnDestroy {
  private readonly API_ROOT = `${window.location.protocol}//${window.location.hostname}:5000/api`;
  private readonly AUDITORIA_API = `${this.API_ROOT}/auditoria`;

  registros: AuditoriaItem[] = [];
  catalogos: CatalogosAuditoria = {
    acciones: [],
    tablas: [],
    usuarios: [],
  };

  resumen: ResumenAuditoria = {
    total: 0,
    hoy: 0,
    actualizaciones: 0,
    firmas: 0,
    errores: 0,
  };

  searchText = "";
  filtroAccion = "";
  filtroTabla = "";
  filtroUsuario = "";
  fechaDesde = "";
  fechaHasta = "";

  pagina = 1;
  paginas = 1;
  limite = 25;
  total = 0;

  cargando = false;
  exportando = false;
  errorMensaje = "";
  expandedId: number | null = null;

  estadoTiempoReal: EstadoTiempoReal = "conectando";
  tiempoRealPausado = false;
  ultimoEventoTiempoReal = "";
  nuevosPendientes = 0;

  readonly skeletonRows = Array.from({ length: 8 });

  private ultimoId = 0;
  private streamController: AbortController | null = null;
  private reconexionTimer: ReturnType<typeof setTimeout> | null = null;
  private respaldoTimer: ReturnType<typeof setInterval> | null = null;
  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;
  private intentosReconexion = 0;
  private destruido = false;
  private readonly cambiosCache = new Map<number, CambioAuditoria[]>();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.inicializar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.detenerTiempoReal();

    if (this.busquedaTimer) {
      clearTimeout(this.busquedaTimer);
    }

    if (this.respaldoTimer) {
      clearInterval(this.respaldoTimer);
    }
  }

  private async inicializar(): Promise<void> {
    await Promise.all([this.cargarCatalogos(), this.cargarAuditoria()]);

    if (!this.destruido) {
      this.conectarTiempoReal();
      this.iniciarSincronizacionDeRespaldo();
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: this.authService.getToken() || "",
      Accept: "application/json",
    });
  }

  private construirParametros(incluirPaginacion = true): HttpParams {
    let params = new HttpParams();

    if (incluirPaginacion) {
      params = params
        .set("pagina", String(this.pagina))
        .set("limite", String(this.limite));
    }

    const q = this.searchText.trim();
    if (q) params = params.set("q", q);
    if (this.filtroAccion) params = params.set("accion", this.filtroAccion);
    if (this.filtroTabla) params = params.set("tabla", this.filtroTabla);
    if (this.filtroUsuario) params = params.set("usuario", this.filtroUsuario);
    if (this.fechaDesde) params = params.set("desde", this.fechaDesde);
    if (this.fechaHasta) params = params.set("hasta", this.fechaHasta);

    return params;
  }

  async cargarAuditoria(silencioso = false): Promise<void> {
    if (this.cargando && !silencioso) return;

    if (!silencioso) {
      this.cargando = true;
      this.errorMensaje = "";
    }

    try {
      const respuesta = await firstValueFrom(
        this.http.get<AuditoriaApiResponse | AuditoriaItem[]>(
          this.AUDITORIA_API,
          {
            headers: this.headers(),
            params: this.construirParametros(true),
          },
        ),
      );

      if (Array.isArray(respuesta)) {
        this.registros = respuesta;
        this.total = respuesta.length;
        this.pagina = 1;
        this.paginas = 1;
        this.resumen = this.calcularResumenLocal(respuesta);
      } else {
        this.registros = respuesta.items || respuesta.data || [];
        this.total = Number(respuesta.total ?? this.registros.length);
        this.pagina = Number(respuesta.pagina ?? this.pagina);
        this.paginas = Math.max(1, Number(respuesta.paginas ?? 1));
        this.limite = Number(respuesta.limite ?? this.limite);
        this.resumen = {
          total: Number(respuesta.resumen?.total ?? this.total),
          hoy: Number(respuesta.resumen?.hoy ?? 0),
          actualizaciones: Number(respuesta.resumen?.actualizaciones ?? 0),
          firmas: Number(respuesta.resumen?.firmas ?? 0),
          errores: Number(respuesta.resumen?.errores ?? 0),
        };
        this.ultimoId = Math.max(
          this.ultimoId,
          Number(respuesta.ultimo_id ?? 0),
        );
      }

      for (const item of this.registros) {
        this.ultimoId = Math.max(this.ultimoId, Number(item.id || 0));
      }

      this.cambiosCache.clear();
      this.nuevosPendientes = 0;
      this.errorMensaje = "";
    } catch (error) {
      this.manejarErrorCarga(error);
    } finally {
      if (!silencioso) {
        this.cargando = false;
      }
      this.cdr.detectChanges();
    }
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const respuesta = await firstValueFrom(
        this.http.get<Partial<CatalogosAuditoria>>(
          `${this.AUDITORIA_API}/catalogos`,
          { headers: this.headers() },
        ),
      );

      this.catalogos = {
        acciones: this.ordenarUnicos(respuesta.acciones || []),
        tablas: this.ordenarUnicos(respuesta.tablas || []),
        usuarios: this.ordenarUnicos(respuesta.usuarios || []),
      };
    } catch {
      this.actualizarCatalogosDesdeRegistros();
    }
  }

  private actualizarCatalogosDesdeRegistros(): void {
    this.catalogos = {
      acciones: this.ordenarUnicos(this.registros.map((item) => item.accion)),
      tablas: this.ordenarUnicos(
        this.registros.map((item) => item.tabla_afectada),
      ),
      usuarios: this.ordenarUnicos(this.registros.map((item) => item.usuario)),
    };
  }

  private ordenarUnicos(valores: Array<string | null | undefined>): string[] {
    return [
      ...new Set(
        valores.map((valor) => String(valor || "").trim()).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }

  programarBusqueda(): void {
    if (this.busquedaTimer) {
      clearTimeout(this.busquedaTimer);
    }

    this.busquedaTimer = setTimeout(() => {
      this.aplicarFiltros();
    }, 400);
  }

  limpiarBusqueda(): void {
    this.searchText = "";
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.pagina = 1;
    this.expandedId = null;
    void this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.searchText = "";
    this.filtroAccion = "";
    this.filtroTabla = "";
    this.filtroUsuario = "";
    this.fechaDesde = "";
    this.fechaHasta = "";
    this.pagina = 1;
    this.expandedId = null;
    void this.cargarAuditoria();
  }

  cambiarLimite(): void {
    this.pagina = 1;
    void this.cargarAuditoria();
  }

  irPagina(nuevaPagina: number): void {
    const destino = Math.min(Math.max(1, nuevaPagina), this.paginas);
    if (destino === this.pagina) return;

    this.pagina = destino;
    this.expandedId = null;
    void this.cargarAuditoria();
  }

  toggleDetalle(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  obtenerCambios(item: AuditoriaItem): CambioAuditoria[] {
    const cache = this.cambiosCache.get(item.id);
    if (cache) return cache;

    const antes = this.aplanarObjeto(this.parsearJson(item.datos_anteriores));
    const despues = this.aplanarObjeto(this.parsearJson(item.datos_nuevos));
    const campos = new Set([...Object.keys(antes), ...Object.keys(despues)]);
    const cambios: CambioAuditoria[] = [];

    for (const campo of campos) {
      const valorAntes = antes[campo];
      const valorDespues = despues[campo];

      if (this.sonEquivalentes(valorAntes, valorDespues)) continue;

      cambios.push({
        campo: this.traducirCampo(campo),
        antes: this.valorVisible(valorAntes),
        despues: this.valorVisible(valorDespues),
      });
    }

    cambios.sort((a, b) => a.campo.localeCompare(b.campo, "es"));
    this.cambiosCache.set(item.id, cambios);
    return cambios;
  }

  private parsearJson(valor: unknown): unknown {
    if (valor === null || valor === undefined || valor === "") return {};
    if (typeof valor !== "string") return valor;

    try {
      return JSON.parse(valor);
    } catch {
      return { valor };
    }
  }

  private aplanarObjeto(valor: unknown, prefijo = ""): Record<string, unknown> {
    const salida: Record<string, unknown> = {};

    if (Array.isArray(valor)) {
      valor.forEach((item, indice) => {
        Object.assign(
          salida,
          this.aplanarObjeto(
            item,
            prefijo ? `${prefijo}.${indice}` : String(indice),
          ),
        );
      });
      return salida;
    }

    if (valor && typeof valor === "object") {
      for (const [clave, contenido] of Object.entries(
        valor as Record<string, unknown>,
      )) {
        const ruta = prefijo ? `${prefijo}.${clave}` : clave;
        if (contenido && typeof contenido === "object") {
          Object.assign(salida, this.aplanarObjeto(contenido, ruta));
        } else {
          salida[ruta] = contenido;
        }
      }
      return salida;
    }

    if (prefijo) salida[prefijo] = valor;
    return salida;
  }

  private sonEquivalentes(a: unknown, b: unknown): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }

  private valorVisible(valor: unknown): string {
    if (valor === undefined) return "No existía";
    if (valor === null || valor === "") return "Vacío";
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (typeof valor === "object") return JSON.stringify(valor, null, 2);
    return String(valor);
  }

  private traducirCampo(campo: string): string {
    return campo
      .split(".")
      .map((segmento) => segmento.replace(/_/g, " "))
      .join(" › ")
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  }

  obtenerClaseAccion(accion: string): string {
    const valor = String(accion || "").toUpperCase();
    if (valor.includes("DELETE") || valor.includes("ELIMIN"))
      return "action-delete";
    if (
      valor.includes("CREATE") ||
      valor.includes("CREAR") ||
      valor.includes("SAVE")
    )
      return "action-create";
    if (valor.includes("LOGIN") || valor.includes("SESION"))
      return "action-login";
    if (
      valor.includes("SIGN") ||
      valor.includes("FIRMA") ||
      valor.includes("FINAL")
    )
      return "action-sign";
    if (valor.includes("DOWNLOAD") || valor.includes("DESCARG"))
      return "action-download";
    if (valor.includes("ERROR") || valor.includes("FAIL"))
      return "action-error";
    return "action-update";
  }

  obtenerIconoAccion(accion: string): string {
    const clase = this.obtenerClaseAccion(accion);
    const iconos: Record<string, string> = {
      "action-delete": "bi-trash3-fill",
      "action-create": "bi-plus-circle-fill",
      "action-login": "bi-box-arrow-in-right",
      "action-sign": "bi-vector-pen",
      "action-download": "bi-download",
      "action-error": "bi-exclamation-octagon-fill",
      "action-update": "bi-pencil-square",
    };
    return iconos[clase] || "bi-activity";
  }

  traducirAccion(accion: string): string {
    const valor = String(accion || "").toUpperCase();
    const traducciones: Record<string, string> = {
      CREATE: "Creación",
      UPDATE: "Actualización",
      DELETE: "Eliminación",
      LOGIN: "Inicio de sesión",
      LOGOUT: "Cierre de sesión",
      SAVE_DRAFT: "Borrador guardado",
      PREPARE_SIGNATURES: "Enviado a firmas",
      SIGN: "Firma electrónica",
      FINALIZE: "Documento finalizado",
      DOWNLOAD: "Descarga",
      UPLOAD: "Carga de archivo",
      ERROR: "Error",
    };
    return traducciones[valor] || valor.replace(/_/g, " ");
  }

  formatearFecha(fecha: string | null | undefined): string {
    const valor = this.convertirFecha(fecha);
    return valor
      ? new Intl.DateTimeFormat("es-EC", {
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(valor)
      : "—";
  }

  formatearFechaCorta(fecha: string | null | undefined): string {
    const valor = this.convertirFecha(fecha);
    return valor
      ? new Intl.DateTimeFormat("es-EC", { dateStyle: "short" }).format(valor)
      : "—";
  }

  formatearHora(fecha: string | null | undefined): string {
    const valor = this.convertirFecha(fecha);
    return valor
      ? new Intl.DateTimeFormat("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(valor)
      : "";
  }

  private convertirFecha(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;
    const normalizada = fecha.includes("T") ? fecha : fecha.replace(" ", "T");
    const valor = new Date(normalizada);
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  async copiarRegistro(item: AuditoriaItem): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      await Swal.fire({
        icon: "success",
        title: "Registro copiado",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire(
        "No se pudo copiar",
        "El navegador bloqueó el portapapeles.",
        "warning",
      );
    }
  }

  async exportarCsv(): Promise<void> {
    if (this.exportando) return;

    this.exportando = true;
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.AUDITORIA_API}/exportar`, {
          headers: this.headers(),
          params: this.construirParametros(false),
          responseType: "blob",
        }),
      );

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const mensaje = await this.extraerMensajeError(error);
      await Swal.fire("No se pudo exportar", mensaje, "error");
    } finally {
      this.exportando = false;
      this.cdr.detectChanges();
    }
  }

  alternarTiempoReal(): void {
    this.tiempoRealPausado = !this.tiempoRealPausado;

    if (this.tiempoRealPausado) {
      this.estadoTiempoReal = "pausado";
      this.detenerTiempoReal(false);
    } else {
      this.estadoTiempoReal = "conectando";
      this.conectarTiempoReal();
    }
  }

  cargarNuevosEventos(): void {
    this.nuevosPendientes = 0;
    this.pagina = 1;
    void this.cargarAuditoria();
  }

  private conectarTiempoReal(): void {
    if (this.destruido || this.tiempoRealPausado) return;

    this.detenerTiempoReal(false);
    this.streamController = new AbortController();
    this.estadoTiempoReal =
      this.intentosReconexion > 0 ? "reconectando" : "conectando";
    this.cdr.detectChanges();

    void this.consumirStream(this.streamController.signal);
  }

  private async consumirStream(signal: AbortSignal): Promise<void> {
    try {
      const respuesta = await fetch(
        `${this.AUDITORIA_API}/stream?ultimo_id=${this.ultimoId}`,
        {
          method: "GET",
          headers: {
            Authorization: this.authService.getToken() || "",
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal,
          cache: "no-store",
        },
      );

      if (!respuesta.ok || !respuesta.body) {
        throw new Error(
          `Conexión de auditoría rechazada (${respuesta.status}).`,
        );
      }

      this.zone.run(() => {
        this.estadoTiempoReal = "conectado";
        this.intentosReconexion = 0;
        this.cdr.detectChanges();
      });

      const reader = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!signal.aborted && !this.destruido) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let separador = buffer.indexOf("\n\n");

        while (separador >= 0) {
          const bloque = buffer.slice(0, separador).trim();
          buffer = buffer.slice(separador + 2);
          this.procesarEventoSse(bloque);
          separador = buffer.indexOf("\n\n");
        }
      }

      if (!signal.aborted && !this.destruido) {
        throw new Error("El canal en tiempo real se cerró inesperadamente.");
      }
    } catch (error) {
      if (signal.aborted || this.destruido || this.tiempoRealPausado) return;

      this.zone.run(() => {
        this.estadoTiempoReal = "reconectando";
        this.cdr.detectChanges();
      });
      this.programarReconexion();
    }
  }

  private procesarEventoSse(bloque: string): void {
    if (!bloque || bloque.startsWith(":")) return;

    let tipo = "message";
    const dataLines: string[] = [];

    for (const linea of bloque.split("\n")) {
      if (linea.startsWith("event:")) tipo = linea.slice(6).trim();
      if (linea.startsWith("data:")) dataLines.push(linea.slice(5).trim());
    }

    const data = dataLines.join("\n");
    if (!data) return;

    if (tipo === "heartbeat" || tipo === "connected") {
      this.zone.run(() => {
        this.estadoTiempoReal = "conectado";
        this.ultimoEventoTiempoReal = new Date().toISOString();
        this.cdr.detectChanges();
      });
      return;
    }

    if (tipo !== "auditoria" && tipo !== "message") return;

    try {
      const item = JSON.parse(data) as AuditoriaItem;
      this.zone.run(() => this.incorporarEventoTiempoReal(item));
    } catch {
      // Evento incompleto: se ignora y la sincronización de respaldo lo recupera.
    }
  }

  private incorporarEventoTiempoReal(item: AuditoriaItem): void {
    if (!item?.id || item.id <= this.ultimoId) return;

    this.ultimoId = item.id;
    this.ultimoEventoTiempoReal = item.fecha || new Date().toISOString();
    this.actualizarCatalogosConItem(item);

    if (
      this.tiempoRealPausado ||
      this.pagina !== 1 ||
      !this.coincideConFiltros(item)
    ) {
      this.nuevosPendientes += 1;
      this.cdr.detectChanges();
      return;
    }

    this.registros = [
      item,
      ...this.registros.filter((registro) => registro.id !== item.id),
    ].slice(0, this.limite);
    this.total += 1;
    this.resumen.total += 1;
    this.actualizarResumenConItem(item);
    this.cambiosCache.delete(item.id);
    this.cdr.detectChanges();
  }

  private actualizarCatalogosConItem(item: AuditoriaItem): void {
    this.catalogos = {
      acciones: this.ordenarUnicos([...this.catalogos.acciones, item.accion]),
      tablas: this.ordenarUnicos([
        ...this.catalogos.tablas,
        item.tabla_afectada,
      ]),
      usuarios: this.ordenarUnicos([...this.catalogos.usuarios, item.usuario]),
    };
  }

  private coincideConFiltros(item: AuditoriaItem): boolean {
    if (this.filtroAccion && item.accion !== this.filtroAccion) return false;
    if (this.filtroTabla && item.tabla_afectada !== this.filtroTabla)
      return false;
    if (this.filtroUsuario && item.usuario !== this.filtroUsuario) return false;

    if (this.fechaDesde && String(item.fecha).slice(0, 10) < this.fechaDesde)
      return false;
    if (this.fechaHasta && String(item.fecha).slice(0, 10) > this.fechaHasta)
      return false;

    const q = this.searchText.trim().toLowerCase();
    if (!q) return true;

    const texto = [
      item.id,
      item.usuario,
      item.accion,
      item.tabla_afectada,
      item.registro_id,
      item.detalle,
      item.ip_usuario,
      item.fecha,
      item.endpoint,
      item.metodo_http,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(q);
  }

  private actualizarResumenConItem(item: AuditoriaItem): void {
    const hoy = new Date().toISOString().slice(0, 10);
    if (String(item.fecha || "").slice(0, 10) === hoy) this.resumen.hoy += 1;

    const accion = String(item.accion || "").toUpperCase();
    if (accion.includes("UPDATE")) this.resumen.actualizaciones += 1;
    if (
      accion.includes("SIGN") ||
      accion.includes("FIRMA") ||
      accion.includes("FINAL")
    ) {
      this.resumen.firmas += 1;
    }
    if (
      String(item.estado || "").toUpperCase() === "ERROR" ||
      accion.includes("ERROR")
    ) {
      this.resumen.errores += 1;
    }
  }

  private programarReconexion(): void {
    if (this.reconexionTimer) clearTimeout(this.reconexionTimer);

    this.intentosReconexion += 1;
    const espera = Math.min(
      30000,
      1000 * 2 ** Math.min(this.intentosReconexion, 5),
    );

    this.reconexionTimer = setTimeout(() => {
      this.conectarTiempoReal();
    }, espera);
  }

  private detenerTiempoReal(limpiarReconexion = true): void {
    this.streamController?.abort();
    this.streamController = null;

    if (limpiarReconexion && this.reconexionTimer) {
      clearTimeout(this.reconexionTimer);
      this.reconexionTimer = null;
    }
  }

  private iniciarSincronizacionDeRespaldo(): void {
    this.respaldoTimer = setInterval(() => {
      if (this.destruido || this.tiempoRealPausado) return;
      if (this.estadoTiempoReal !== "conectado") {
        void this.cargarAuditoria(true);
      }
    }, 15000);
  }

  private manejarErrorCarga(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        this.errorMensaje =
          "La sesión no tiene permisos para consultar la auditoría.";
        return;
      }

      this.errorMensaje =
        error.error?.error ||
        error.error?.mensaje ||
        `Error del servidor (${error.status || 0}).`;
      return;
    }

    this.errorMensaje =
      error instanceof Error
        ? error.message
        : "No se pudo conectar con el servicio de auditoría.";
  }

  private async extraerMensajeError(error: unknown): Promise<string> {
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        const texto = await error.error.text();
        const parsed = JSON.parse(texto);
        return (
          parsed.error || parsed.mensaje || "Error al procesar la solicitud."
        );
      } catch {
        return "Error al procesar la solicitud.";
      }
    }

    if (error instanceof HttpErrorResponse) {
      return error.error?.error || error.error?.mensaje || error.message;
    }

    return error instanceof Error ? error.message : "Error desconocido.";
  }

  private calcularResumenLocal(items: AuditoriaItem[]): ResumenAuditoria {
    const resumen: ResumenAuditoria = {
      total: items.length,
      hoy: 0,
      actualizaciones: 0,
      firmas: 0,
      errores: 0,
    };

    const hoy = new Date().toISOString().slice(0, 10);
    for (const item of items) {
      const accion = String(item.accion || "").toUpperCase();
      if (String(item.fecha || "").slice(0, 10) === hoy) resumen.hoy += 1;
      if (accion.includes("UPDATE")) resumen.actualizaciones += 1;
      if (
        accion.includes("SIGN") ||
        accion.includes("FIRMA") ||
        accion.includes("FINAL")
      )
        resumen.firmas += 1;
      if (
        String(item.estado || "").toUpperCase() === "ERROR" ||
        accion.includes("ERROR")
      )
        resumen.errores += 1;
    }

    return resumen;
  }

  volver(): void {
    this.router.navigate(["/admin/dashboard"]);
  }

  get hayFiltrosActivos(): boolean {
    return Boolean(
      this.searchText.trim() ||
      this.filtroAccion ||
      this.filtroTabla ||
      this.filtroUsuario ||
      this.fechaDesde ||
      this.fechaHasta,
    );
  }

  get rangoInicio(): number {
    return this.total === 0 ? 0 : (this.pagina - 1) * this.limite + 1;
  }

  get rangoFin(): number {
    return Math.min(this.pagina * this.limite, this.total);
  }

  get textoEstadoTiempoReal(): string {
    const textos: Record<EstadoTiempoReal, string> = {
      conectando: "Conectando en tiempo real",
      conectado: "Tiempo real activo",
      reconectando: "Reconectando",
      pausado: "Tiempo real pausado",
      error: "Sin conexión",
    };
    return textos[this.estadoTiempoReal];
  }

  get claseEstadoTiempoReal(): string {
    return `realtime-status--${this.estadoTiempoReal}`;
  }
}

export { AuditoriaComponent as Auditoria };
