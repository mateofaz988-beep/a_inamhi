import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EscalaOcupacionalItem {
  grupo_ocupacional: string;
  grado: string;
  remuneracion: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class EscalaOcupacionalService {

  private readonly apiUrl = `${environment.apiUrl}/escala-ocupacional`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la escala de remuneración por grupo ocupacional.
   * Antes vivía hardcodeada en solicitud-permisos.ts; ahora es la misma
   * tabla institucional pero editable desde la base de datos.
   */
  obtenerEscala(): Observable<EscalaOcupacionalItem[]> {
    return this.http.get<EscalaOcupacionalItem[]>(this.apiUrl);
  }
}
