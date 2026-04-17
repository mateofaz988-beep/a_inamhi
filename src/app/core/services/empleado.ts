import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = 'http://localhost:3000/api/empleados';

  constructor(private http: HttpClient) { }

  getEmpleados(): Observable<EmpleadoService[]> {
    return this.http.get<EmpleadoService[]>(this.apiUrl);
  }
}