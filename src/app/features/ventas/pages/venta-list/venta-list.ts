import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Pagina } from '../../../../core/models/pagina';
import { mensajeError } from '../../../../core/utils/http-error';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { EstadoVenta, FiltroVentas, Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

function numeroOpcional(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function estadoOpcional(v: unknown): EstadoVenta | null {
  return v === 'REGISTRADA' || v === 'ANULADA' ? v : null;
}

function textoOpcional(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

@Component({
  selector: 'app-venta-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, Paginador, SiPermiso],
  templateUrl: './venta-list.html',
  styleUrl: './venta-list.css',
})
export class VentaList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ventaService = inject(VentaService);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);

  // Parámetros sincronizados con la URL
  readonly pagina = input(0, {
    transform: (v: unknown) => numberAttribute(v, 0),
  });
  readonly tamanio = input(10, {
    transform: (v: unknown) => numberAttribute(v, 10),
  });
  readonly clienteId = input<number | null, unknown>(null, { transform: numeroOpcional });
  readonly estado = input<EstadoVenta | null, unknown>(null, { transform: estadoOpcional });
  readonly desde = input<string | null, unknown>(null, { transform: textoOpcional });
  readonly hasta = input<string | null, unknown>(null, { transform: textoOpcional });

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly validacionError = signal<string | null>(null);
  protected readonly ahora = signal(new Date());

  protected readonly filtros = this.fb.group({
    clienteId: this.fb.control<number | null>(null),
    estado: this.fb.control<EstadoVenta | null>(null),
    desde: this.fb.control<string | null>(null),
    hasta: this.fb.control<string | null>(null),
  });

  protected readonly ventas = rxResource({
    params: () => ({
      filtro: {
        clienteId: this.clienteId(),
        estado: this.estado(),
        desde: this.desde(),
        hasta: this.hasta(),
      } satisfies FiltroVentas,
      pagina: this.pagina(),
      tamanio: this.tamanio(),
    }),
    stream: ({ params }) =>
      this.ventaService.buscar(params.filtro, params.pagina, params.tamanio),
  });

  protected readonly pag = linkedSignal<
    Pagina<Venta> | undefined,
    Pagina<Venta> | undefined
  >({
    source: () => this.ventas.value(),
    computation: (nueva, previa) => nueva ?? previa?.value,
  });

  protected readonly error = computed(() => {
    if (this.validacionError()) return this.validacionError();
    const err = this.ventas.error();
    if (!err) return null;
    return err instanceof HttpErrorResponse ? mensajeError(err) : 'Error al buscar ventas.';
  });

  /** Suma de los totales de la página mostrada (solo ventas REGISTRADAS). */
  protected readonly totalPagina = computed(() =>
    (this.pag()?.contenido ?? [])
      .filter(v => v.estado === 'REGISTRADA')
      .reduce((suma, v) => suma + v.total, 0)
  );

  constructor() {
    effect(() => {
      this.filtros.setValue(
        {
          clienteId: this.clienteId(),
          estado: this.estado(),
          desde: this.desde(),
          hasta: this.hasta(),
        },
        { emitEvent: false }
      );
    });
  }

  ngOnInit(): void {
    this.clienteService.listar(0, 100).subscribe({
      next: p => this.clientes.set(p.contenido),
      error: (err: HttpErrorResponse) => this.validacionError.set(mensajeError(err)),
    });
  }

  /** Texto con los filtros aplicados, para el encabezado impreso. */
  protected resumenFiltros(): string {
    const f = this.filtros.getRawValue();
    const cliente = this.clientes().find(c => c.id === f.clienteId);
    const partes = [
      cliente ? `cliente ${cliente.apellidos}, ${cliente.nombres}` : '',
      f.estado ? `estado ${f.estado}` : '',
      f.desde ? `desde ${f.desde}` : '',
      f.hasta ? `hasta ${f.hasta}` : '',
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : 'ninguno (todas las ventas)';
  }

  imprimirConsulta(): void {
    this.ahora.set(new Date());
    setTimeout(() => window.print());
  }

  buscar(): void {
    const { clienteId, estado, desde, hasta } = this.filtros.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.validacionError.set('La fecha «desde» no puede ser posterior a la fecha «hasta».');
      return;
    }
    this.navegar({
      clienteId: clienteId || null,
      estado: estado || null,
      desde: desde || null,
      hasta: hasta || null,
      pagina: 0,
    });
  }

  limpiar(): void {
    this.filtros.reset();
    this.navegar({
      clienteId: null,
      estado: null,
      desde: null,
      hasta: null,
      pagina: 0,
    });
  }

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  private navegar(cambios: Record<string, string | number | null>): void {
    this.validacionError.set(null);
    this.router.navigate([], {
      queryParams: cambios,
      queryParamsHandling: 'merge',
    });
  }
}
