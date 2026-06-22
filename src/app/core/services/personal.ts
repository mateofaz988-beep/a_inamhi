import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Funcionario, FuncionarioPasivo } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class PersonalService {

  private readonly apiUrl = `${environment.apiUrl}/personal`;

  constructor(private http: HttpClient) {}

  // ── PERSONAL ACTIVO ──────────────────────────────
  getAll(): Observable<Funcionario[]> {
    return this.http.get<Funcionario[]>(this.apiUrl);
  }

  getById(id: number): Observable<Funcionario> {
    return this.http.get<Funcionario>(`${this.apiUrl}/${id}`);
  }

  getByCedula(cedula: string): Observable<Funcionario> {
    return this.http.get<Funcionario>(`${this.apiUrl}/cedula/${cedula}`);
  }

  create(funcionario: Partial<Funcionario>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, funcionario);
  }

  update(id: number, funcionario: Partial<Funcionario>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, funcionario);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // ── DESVINCULACIÓN ───────────────────────────────
  desvincular(id: number, motivo_salida: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/desvincular`, { motivo_salida });
  }

  // ── PERSONAL PASIVO ──────────────────────────────
  getPasivos(): Observable<FuncionarioPasivo[]> {
    return this.http.get<FuncionarioPasivo[]>(`${this.apiUrl}/pasivo`);
  }

  reactivar(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/pasivo/${id}/reactivar`, {});
  }
}
