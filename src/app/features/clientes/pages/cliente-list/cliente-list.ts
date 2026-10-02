import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Cliente } from '../../models/cliente.model';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { ClienteService } from '../../services/cliente-service';
import { mensajeError } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-cliente-list',
  imports: [RouterLink],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<'apellidos' | 'dni'>('apellidos');
  protected readonly direccion = signal<'asc' | 'desc'>('asc');

  protected readonly respuesta = signal<PaginaResponse<Cliente> | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly clienteADarDeBaja = signal<Cliente | null>(null);
  protected readonly filtro = signal('');

  protected readonly filtrados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const lista = this.respuesta()?.contenido ?? [];
    if (!texto) {
      return lista;
    }
    return lista.filter(c => {
      const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase();
      const apellidosNombres = `${c.apellidos} ${c.nombres}`.toLowerCase();
      return (
        c.dni.toLowerCase().includes(texto) ||
        nombreCompleto.includes(texto) ||
        apellidosNombres.includes(texto)
      );
    });
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
    this.clienteService
      .listar(this.pagina(), this.tamanio(), this.ordenarPor(), this.direccion())
      .subscribe({
        next: resp => {
          this.respuesta.set(resp);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.mostrarError(mensajeError(err));
          this.cargando.set(false);
        },
      });
  }

  cambiarPagina(delta: number): void {
    const nuevaPagina = this.pagina() + delta;
    if (nuevaPagina >= 0) {
      this.pagina.set(nuevaPagina);
      this.cargar();
    }
  }

  cambiarTamanio(tam: number | string): void {
    this.tamanio.set(Number(tam));
    this.pagina.set(0);
    this.cargar();
  }

  ordenar(campo: 'apellidos' | 'dni'): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set('asc');
    }
    this.cargar();
  }

  solicitarBaja(cliente: Cliente): void {
    this.clienteADarDeBaja.set(cliente);
  }

  cancelarBaja(): void {
    this.clienteADarDeBaja.set(null);
  }

  confirmarBaja(): void {
    const cliente = this.clienteADarDeBaja();
    if (!cliente) return;

    this.error.set(null);
    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.clienteADarDeBaja.set(null);
        this.cargar();
        this.mostrarExito(`Cliente "${cliente.nombres} ${cliente.apellidos}" dado de baja correctamente`);
      },
      error: (err: HttpErrorResponse) => {
        this.clienteADarDeBaja.set(null);
        this.mostrarError(mensajeError(err));
      },
    });
  }
}
