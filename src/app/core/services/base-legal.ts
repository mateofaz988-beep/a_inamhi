import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BaseLegalItem {
  tipo_movimiento: string;
  base_legal: string;
}

@Injectable({
  providedIn: 'root'
})
export class BaseLegalService {

  private readonly apiUrl = `${environment.apiUrl}/base-legal`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el catálogo completo de bases legales para acciones de personal.
   * Retorna un Observable con el array de items de base legal.
   */
  obtenerBaseLegal(): Observable<BaseLegalItem[]> {
    return this.http.get<BaseLegalItem[]>(this.apiUrl);
  }

  /**
   * Busca la base legal por tipo de movimiento.
   * @param tipoMovimiento - El tipo de movimiento/acción a buscar
   * @returns La base legal correspondiente o undefined si no existe
   */
  buscarPorTipoMovimiento(tipoMovimiento: string, items: BaseLegalItem[]): BaseLegalItem | undefined {
    if (!tipoMovimiento || !items || items.length === 0) {
      return undefined;
    }

    return items.find(
      item => item.tipo_movimiento.toUpperCase() === tipoMovimiento.toUpperCase()
    );
  }
}
