import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../../../core/services/auth';
import { SharedModule } from '../../../../shared/shared-module';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SharedModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly API_PERSONAL = 'http://localhost:5000/api/personal';
  private readonly API_PASIVOS = 'http://localhost:5000/api/personal/pasivo';

  personal: any[] = [];
  pasivos: any[] = [];

  totalActivos = 0;
  totalDesvinculados = 0;
  totalModalidades = 0;
  totalUnidades = 0;

  private modalidadChart: Chart | null = null;
  private generoChart: Chart | null = null;

  constructor(
    public authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarDatosDashboard();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderizarGraficas();
    }, 300);
  }

  ngOnDestroy(): void {
    this.destruirGraficas();
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  cargarDatosDashboard(): void {
    this.http.get<any[]>(this.API_PERSONAL).subscribe({
      next: (data) => {
        this.personal = Array.isArray(data) ? data : [];
        this.calcularMetricas();
        setTimeout(() => this.renderizarGraficas(), 200);
      },
      error: (err) => {
        console.error('Error cargando personal:', err);
      }
    });

    if (this.authService.isAdmin()) {
      this.http.get<any[]>(this.API_PASIVOS, {
        headers: this.getHeaders()
      }).subscribe({
        next: (data) => {
          this.pasivos = Array.isArray(data) ? data : [];
          this.totalDesvinculados = this.pasivos.length;
        },
        error: (err) => {
          console.error('Error cargando funcionarios desvinculados:', err);
          this.totalDesvinculados = 0;
        }
      });
    }
  }

  calcularMetricas(): void {
    this.totalActivos = this.personal.length;

    const modalidades = new Set(
      this.personal
        .map(emp => String(emp.modalidad || '').trim())
        .filter(valor => valor.length > 0)
    );

    const unidades = new Set(
      this.personal
        .map(emp => String(emp.unidad || '').trim())
        .filter(valor => valor.length > 0)
    );

    this.totalModalidades = modalidades.size;
    this.totalUnidades = unidades.size;
  }

  contarPorCampo(campo: string): { labels: string[]; values: number[] } {
    const contador: Record<string, number> = {};

    this.personal.forEach(emp => {
      const valor = String(emp?.[campo] || 'No registrado').trim() || 'No registrado';
      contador[valor] = (contador[valor] || 0) + 1;
    });

    return {
      labels: Object.keys(contador),
      values: Object.values(contador)
    };
  }

  renderizarGraficas(): void {
    this.destruirGraficas();

    const modalidadCanvas = document.getElementById('modalidadChart') as HTMLCanvasElement | null;
    const generoCanvas = document.getElementById('generoChart') as HTMLCanvasElement | null;

    if (!modalidadCanvas || !generoCanvas || this.personal.length === 0) return;

    const modalidadData = this.contarPorCampo('modalidad');
    const generoData = this.contarPorCampo('genero');

    this.modalidadChart = new Chart(modalidadCanvas, {
      type: 'bar',
      data: {
        labels: modalidadData.labels,
        datasets: [
          {
            label: 'Funcionarios',
            data: modalidadData.values,
            borderWidth: 1,
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });

    this.generoChart = new Chart(generoCanvas, {
      type: 'doughnut',
      data: {
        labels: generoData.labels,
        datasets: [
          {
            label: 'Funcionarios',
            data: generoData.values,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  destruirGraficas(): void {
    if (this.modalidadChart) {
      this.modalidadChart.destroy();
      this.modalidadChart = null;
    }

    if (this.generoChart) {
      this.generoChart.destroy();
      this.generoChart = null;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}