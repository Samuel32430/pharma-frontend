import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Pagina } from '../../../../core/models/pagina';
import { mensajeError } from '../../../../core/utils/http-error';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';

@Component({
  selector: 'app-producto-list',
  imports: [RouterLink, CurrencyPipe, Paginador, SiPermiso],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);

  // Llegan de la URL (?pagina=2&tamanio=20&orden=nombre&dir=asc)
  readonly pagina = input(0, {
    transform: (v: unknown) => numberAttribute(v, 0),
  });
  readonly tamanio = input(20, {
    transform: (v: unknown) => numberAttribute(v, 20),
  });
  readonly orden = input<string, unknown>('nombre', {
    transform: (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : 'nombre'),
  });
  readonly dir = input<'asc' | 'desc', unknown>('asc', {
    transform: (v: unknown) => (v === 'desc' ? 'desc' : 'asc'),
  });

  protected readonly accionError = signal<string | null>(null);

  protected readonly productos = rxResource({
    params: () => ({
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      ordenarPor: this.orden(),
      direccion: this.dir(),
    }),
    stream: ({ params }) => this.productoService.listar(params),
  });

  // Conserva la página anterior mientras llega la nueva (sin parpadeo)
  protected readonly pag = linkedSignal<
    Pagina<Producto> | undefined,
    Pagina<Producto> | undefined
  >({
    source: () => this.productos.value(),
    computation: (nueva, previa) => nueva ?? previa?.value,
  });

  protected readonly error = computed(() => {
    if (this.accionError()) return this.accionError();
    const err = this.productos.error();
    if (!err) return null;
    return err instanceof HttpErrorResponse ? mensajeError(err) : 'Error al cargar los productos.';
  });

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 }); // vuelve a la primera
  }

  protected ordenarPor(campo: string): void {
    const dir = this.orden() === campo && this.dir() === 'asc' ? 'desc' : 'asc';
    this.navegar({ orden: campo, dir, pagina: 0 });
  }

  protected darDeBaja(producto: Producto): void {
    if (!confirm(`¿Dar de baja el producto "${producto.nombre}"?`)) {
      return;
    }
    this.accionError.set(null);
    this.productoService.darDeBaja(producto.id).subscribe({
      next: () => this.productos.reload(),
      error: (err: HttpErrorResponse) => this.accionError.set(mensajeError(err)),
    });
  }

  private navegar(cambios: Record<string, string | number>): void {
    this.accionError.set(null);
    this.router.navigate([], {
      queryParams: cambios,
      queryParamsHandling: 'merge',
    });
  }
}
