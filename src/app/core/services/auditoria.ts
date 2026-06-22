import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditEntry } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {

  private readonly apiUrl = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(this.apiUrl);
  }
}
