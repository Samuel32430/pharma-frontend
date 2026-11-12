import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConsultaPagina, Pagina } from '../../../core/models/pagina';
import { Producto, ProductoRequest } from '../models/producto.model';

@Service()
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  listar(c: ConsultaPagina): Observable<Pagina<Producto>> {
    const params = new HttpParams()
      .set('pagina', c.pagina)
      .set('tamanio', c.tamanio)
      .set('ordenarPor', c.ordenarPor)
      .set('direccion', c.direccion);
    return this.http.get<Pagina<Producto>>(this.url, { params });
  }

  buscarDisponibles(q = ''): Observable<Producto[]> {
    const params = q.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http.get<Producto[]>(`${this.url}/disponibles`, { params });
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  crear(dto: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.url, dto);
  }

  actualizar(id: number, dto: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/${id}`, dto);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
