import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Pagina } from '../../../../core/models/pagina';
import { mensajeError } from '../../../../core/utils/http-error';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente-service';

@Component({
  selector: 'app-cliente-list',
  imports: [RouterLink, Paginador],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pagina = input(0, {
    transform: (v: unknown) => numberAttribute(v, 0),
  });
  readonly tamanio = input(10, {
    transform: (v: unknown) => numberAttribute(v, 10),
  });
  readonly orden = input<'apellidos' | 'dni', unknown>('apellidos', {
    transform: (v: unknown) => (v === 'dni' ? 'dni' : 'apellidos'),
  });
  readonly dir = input<'asc' | 'desc', unknown>('asc', {
    transform: (v: unknown) => (v === 'desc' ? 'desc' : 'asc'),
  });

  protected readonly clientes = rxResource({
    params: () => ({
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      ordenarPor: this.orden(),
      direccion: this.dir(),
    }),
    stream: ({ params }) =>
      this.clienteService.listar(
        params.pagina,
        params.tamanio,
        params.ordenarPor,
        params.direccion,
      ),
  });

  protected readonly pag = linkedSignal<
    Pagina<Cliente> | undefined,
    Pagina<Cliente> | undefined
  >({
    source: () => this.clientes.value(),
    computation: (nueva, previa) => nueva ?? previa?.value,
  });

  protected readonly accionError = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly clienteADarDeBaja = signal<Cliente | null>(null);
  protected readonly filtro = signal('');

  protected readonly error = computed(() => {
    if (this.accionError()) return this.accionError();
    const err = this.clientes.error();
    if (!err) return null;
    return err instanceof HttpErrorResponse ? mensajeError(err) : 'Error al cargar los clientes.';
  });

  protected readonly filtrados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const lista = this.pag()?.contenido ?? [];
    if (!texto) return lista;
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
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.accionError.set(mensaje);
    this.errorTimer = setTimeout(() => this.accionError.set(null), 3000);
  }

  protected mostrarExito(mensaje: string): void {
    if (this.exitoTimer) clearTimeout(this.exitoTimer);
    this.mensajeExito.set(mensaje);
    this.exitoTimer = setTimeout(() => this.mensajeExito.set(null), 3000);
  }

  ngOnInit(): void {
    const exito = this.route.snapshot.queryParamMap.get('exito');
    if (exito) {
      this.mostrarExito(exito);
      this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  protected ordenar(campo: 'apellidos' | 'dni'): void {
    const dir = this.orden() === campo && this.dir() === 'asc' ? 'desc' : 'asc';
    this.navegar({ orden: campo, dir, pagina: 0 });
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

    this.accionError.set(null);
    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.clienteADarDeBaja.set(null);
        this.clientes.reload();
        this.mostrarExito(`Cliente "${cliente.nombres} ${cliente.apellidos}" dado de baja correctamente`);
      },
      error: (err: HttpErrorResponse) => {
        this.clienteADarDeBaja.set(null);
        this.mostrarError(mensajeError(err));
      },
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
