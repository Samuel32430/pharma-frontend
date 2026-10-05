import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { mensajeError } from '../../../../core/utils/http-error';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { OrdenDireccion, OrdenProducto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';

@Component({
  imports: [RouterLink, CurrencyPipe],
  selector: 'app-producto-list',  
  styleUrl: './producto-list.css',
  templateUrl: './producto-list.html',
})
export class ProductoList implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);

  readonly categoriaId = input<string>();

  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<OrdenProducto>('nombre');
  protected readonly direccion = signal<OrdenDireccion>('asc');
  protected readonly resultado = signal<PaginaResponse<Producto> | null>(null);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly categoriaFiltro = signal<number | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly productos = computed(() => {
    const filtro = this.categoriaFiltro();
    const lista = this.resultado()?.contenido ?? [];
    return filtro === null ? lista : lista.filter(p => p.categoriaId === filtro);
  });

  protected readonly categoriaSeleccionadaNombre = computed(() => {
    const id = this.categoriaFiltro();
    return this.categorias().find(c => c.id === id)?.nombre ?? '';
  });

  ngOnInit(): void {
    const paramCatId = this.categoriaId();
    if (paramCatId) {
      this.categoriaFiltro.set(Number(paramCatId));
      this.tamanio.set(100);
    }
    this.categoriaService.listar().subscribe({
      next: datos => this.categorias.set(datos),
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err)),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.productoService
      .listar(
        this.pagina(),
        this.tamanio(),
        this.ordenarPor(),
        this.direccion()
      )
      .subscribe({
        next: pagina => {
          this.resultado.set(pagina);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(mensajeError(err));
          this.cargando.set(false);
        },
      });
  }
  irA(pagina : number) : void{
    this.pagina.set(pagina);
    this.cargar();
  }
  cambiarTamanio(valor: string): void {
    this.tamanio.set(Number(valor));
    this.irA(0);
  }
  ordenar(campo: OrdenProducto): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set('asc');
    }
    this.irA(0);
  }
  filtrarPorCategoria(valor: string): void {
    this.categoriaFiltro.set(valor ? Number(valor) : null);
  }
  darDeBaja(producto: Producto): void {
    if (!confirm(`¿Dar de baja el producto "${producto.nombre}"?`)) {
      return;
    }
    this.productoService.darDeBaja(producto.id).subscribe({
      next: () => {
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err));
      },
    });
  }
}
