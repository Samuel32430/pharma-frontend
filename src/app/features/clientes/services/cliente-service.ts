import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/models/pagina';
import { Cliente, ClienteRequest } from '../models/cliente.model';

@Service()
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clientes`;

  listar(
    pagina = 0,
    tamanio = 10,
    ordenarPor = 'apellidos',
    direccion: 'asc' | 'desc' = 'asc'
  ): Observable<Pagina<Cliente>> {
    const params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanio', tamanio)
      .set('ordenarPor', ordenarPor)
      .set('direccion', direccion);
    return this.http.get<Pagina<Cliente>>(this.url, { params });
  }

  buscarActivos(q = ''): Observable<Cliente[]> {
    const params = q.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http.get<Cliente[]>(`${this.url}/activos`, { params });
  }

  obtener(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.url}/${id}`);
  }

  crear(dto: ClienteRequest): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, dto);
  }

  actualizar(id: number, dto: ClienteRequest): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.url}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
