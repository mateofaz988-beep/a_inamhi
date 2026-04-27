import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';


@Component({
  selector: 'app-funcionarios-desvinculados',
  templateUrl: './funcionarios-desvinculados.html',
  styleUrls: ['./funcionarios-desvinculados.scss'],
  standalone: false
})
export class FuncionariosDesvinculadosComponent implements OnInit {

  private readonly API_URL = 'http://localhost:5000/api/personal/pasivo';

  funcionariosPasivos: any[] = [];
  funcionariosFiltrados: any[] = [];

  searchText: string = '';
  cargando: boolean = false;
  reactivandoId: number | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerFuncionariosPasivos();
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  volver(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  obtenerFuncionariosPasivos(): void {
    if (!this.authService.isAdmin()) {
      Swal.fire(
        'Acceso denegado',
        'Solo el administrador puede ver funcionarios desvinculados',
        'warning'
      );
      return;
    }

    this.cargando = true;

    this.http.get<any[]>(this.API_URL, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.funcionariosPasivos = Array.isArray(data) ? data : [];
        this.funcionariosFiltrados = [...this.funcionariosPasivos];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERROR CARGANDO FUNCIONARIOS PASIVOS:', err);
        this.cargando = false;

        Swal.fire(
          'Error',
          err?.error?.error || 'No se pudieron cargar los funcionarios desvinculados',
          'error'
        );
      }
    });
  }

  buscar(): void {
    const texto = this.searchText.toLowerCase().trim();

    if (!texto) {
      this.funcionariosFiltrados = [...this.funcionariosPasivos];
      return;
    }

    this.funcionariosFiltrados = this.funcionariosPasivos.filter((emp: any) => {
      const id = String(emp.id || '').toLowerCase();
      const idPersonal = String(emp.id_personal || '').toLowerCase();
      const cedula = String(emp.cedula || '').toLowerCase();
      const nombres = String(emp.nombres || '').toLowerCase();
      const modalidad = String(emp.modalidad || '').toLowerCase();
      const cargo = String(emp.cargo || '').toLowerCase();
      const unidad = String(emp.unidad || '').toLowerCase();
      const motivo = String(emp.motivo_salida || '').toLowerCase();
      const responsable = String(emp.usuario_responsable || '').toLowerCase();

      return (
        id.includes(texto) ||
        idPersonal.includes(texto) ||
        cedula.includes(texto) ||
        nombres.includes(texto) ||
        modalidad.includes(texto) ||
        cargo.includes(texto) ||
        unidad.includes(texto) ||
        motivo.includes(texto) ||
        responsable.includes(texto)
      );
    });
  }

  reactivarFuncionario(emp: any): void {
    if (!emp?.id) {
      Swal.fire('Error', 'No se encontró el ID del funcionario', 'error');
      return;
    }

    Swal.fire({
      title: '¿Reactivar funcionario?',
      html: `
        <strong>${emp.nombres || 'Funcionario'}</strong><br>
        Cédula: ${emp.cedula || 'Sin cédula'}<br><br>
        El funcionario volverá a la matriz principal de personal activo.
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.reactivandoId = emp.id;

      this.http.post<any>(`${this.API_URL}/${emp.id}/reactivar`, {}, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res) => {
          this.reactivandoId = null;

          Swal.fire({
            icon: 'success',
            title: 'Funcionario reactivado',
            text: res?.message || 'El funcionario volvió a la matriz principal',
            timer: 1800,
            showConfirmButton: false
          });

          this.obtenerFuncionariosPasivos();
        },
        error: (err) => {
          console.error('ERROR REACTIVANDO FUNCIONARIO:', err);
          this.reactivandoId = null;

          Swal.fire(
            'Error',
            err?.error?.error || 'No se pudo reactivar el funcionario',
            'error'
          );
        }
      });
    });
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '-';

    const texto = String(fecha).trim();

    if (texto.includes('T')) {
      const fechaParte = texto.split('T')[0];
      const [anio, mes, dia] = fechaParte.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    if (texto.includes(' ') && texto.includes('-')) {
      const fechaParte = texto.split(' ')[0];
      const [anio, mes, dia] = fechaParte.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    if (texto.includes('-')) {
      const partes = texto.split('-');
      if (partes.length === 3) {
        const [anio, mes, dia] = partes;
        return `${dia}/${mes}/${anio}`;
      }
    }

    return texto;
  }

  formatearFechaHora(fecha: any): string {
    if (!fecha) return '-';

    const texto = String(fecha).trim();

    if (texto.includes('T')) {
      const [fechaParte, horaParteRaw] = texto.split('T');
      const [anio, mes, dia] = fechaParte.split('-');
      const horaParte = horaParteRaw?.split('.')[0] || '';
      return `${dia}/${mes}/${anio} ${horaParte}`;
    }

    if (texto.includes(' ') && texto.includes('-')) {
      const [fechaParte, horaParte] = texto.split(' ');
      const [anio, mes, dia] = fechaParte.split('-');
      return `${dia}/${mes}/${anio} ${horaParte || ''}`;
    }

    return this.formatearFecha(texto);
  }
}