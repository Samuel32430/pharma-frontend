import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Categoria } from '../../models/categoria.model';
import { CategoriaService } from '../../services/categoria-service';
import { mensajeError } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-categoria-list',
  imports: [RouterLink],
  templateUrl: './categoria-list.html',
  styleUrl: './categoria-list.css',
})
export class CategoriaList implements OnInit {
  private readonly categoriaService = inject(CategoriaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly categoriaAEliminar = signal<Categoria | null>(null);
  protected readonly filtro = signal('');

  protected readonly filtradas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    return this.categorias().filter(c => c.nombre.toLowerCase().includes(texto));
  });

  private errorTimer?: ReturnType<typeof setTimeout>;
  private exitoTimer?: ReturnType<typeof setTimeout>;

  private mostrarError(mensaje: string): void {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
    }
    this.error.set(mensaje);
    this.errorTimer = setTimeout(() => {
      this.error.set(null);
    }, 3000);
  }

  protected mostrarExito(mensaje: string): void {
    if (this.exitoTimer) {
      clearTimeout(this.exitoTimer);
    }
    this.mensajeExito.set(mensaje);
    this.exitoTimer = setTimeout(() => {
      this.mensajeExito.set(null);
    }, 3000);
  }

  ngOnInit(): void {
    this.cargar();

    const exito = this.route.snapshot.queryParamMap.get('exito');
    if (exito) {
      this.mostrarExito(exito);
      this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.categoriaService.listar().subscribe({
      next: datos => {
        this.categorias.set(datos);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.mostrarError(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  solicitarEliminar(categoria: Categoria): void {
    this.categoriaAEliminar.set(categoria);
  }

  cancelarEliminar(): void {
    this.categoriaAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const categoria = this.categoriaAEliminar();
    if (!categoria) return;

    this.error.set(null);
    this.categoriaService.eliminar(categoria.id).subscribe({
      next: () => {
        this.categorias.update(lista => lista.filter(c => c.id !== categoria.id));
        this.categoriaAEliminar.set(null);
        this.mostrarExito(`Categoría "${categoria.nombre}" eliminada correctamente`);
      },
      error: (err: HttpErrorResponse) => {
        this.categoriaAEliminar.set(null);
        this.mostrarError(mensajeError(err));
      },
    });
  }
}
