import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Permiso, PerfilUsuario, Sesion } from './auth.model';

/** Clave con la que se guarda la sesión en sessionStorage. */
const CLAVE_SESION = 'pharmasoft.sesion';

/**
 * Única fuente de verdad sobre la sesión del usuario.
 *
 * - La sesión vive en un signal: el menú, el encabezado y los guards
 *   reaccionan solos cuando cambia.
 * - Se guarda en sessionStorage para sobrevivir a una recarga (F5), pero
 *   se borra al cerrar el navegador: la botica usa computadoras compartidas.
 * - Monitorea en tiempo real los segundos restantes y emite la señal
 *   reactiva `porVencer` cuando restan 120 segundos o menos.
 * - Un temporizador cierra la sesión cuando el token vence.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;

  private readonly sesionActual = signal<Sesion | null>(this.leerSesionGuardada());
  private temporizador?: ReturnType<typeof setTimeout>;
  private intervaloSegundos?: ReturnType<typeof setInterval>;

  /** Cantidad de segundos restantes antes de que expire el token JWT. */
  readonly segundosRestantes = signal<number>(0);

  /** Indica si el usuario ocultó el aviso pulsando la «×» para esta sesión. */
  private readonly avisoOculto = signal<boolean>(false);

  /**
   * Verdadero cuando quedan 120 segundos (2 minutos) o menos, hay una sesión activa
   * y el usuario no ha descartado el aviso.
   */
  readonly porVencer = computed(() => {
    const sesion = this.sesionActual();
    return (
      sesion !== null &&
      !this.avisoOculto() &&
      this.segundosRestantes() <= 120 &&
      this.segundosRestantes() > 0
    );
  });

  readonly sesion = this.sesionActual.asReadonly();
  readonly autenticado = computed(() => this.sesionActual() !== null);

  constructor() {
    const sesion = this.sesionActual();
    if (sesion) this.programarExpiracion(sesion);
  }

  /** Envía las credenciales; si son correctas, guarda la sesión. */
  login(credenciales: LoginRequest): Observable<Sesion> {
    return this.http.post<LoginResponse>(`${this.url}/login`, credenciales).pipe(
      map(r => ({
        token: r.token,
        expiraEn: Date.now() + r.expiraEnSegundos * 1000,
        username: r.username,
        nombreCompleto: r.nombreCompleto,
        roles: r.roles,
        permisos: r.permisos,
      })),
      tap(sesion => this.iniciar(sesion)),
    );
  }

  /**
   * Cierra la sesión y vuelve al login.
   * Si la causa es la expiración, el login lo avisa y, tras entrar de nuevo,
   * regresa a la página donde estaba el usuario.
   */
  cerrarSesion(motivo?: 'expirada', volverA?: string): void {
    clearTimeout(this.temporizador);
    if (this.intervaloSegundos) {
      clearInterval(this.intervaloSegundos);
      this.intervaloSegundos = undefined;
    }
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesionActual.set(null);
    this.segundosRestantes.set(0);
    this.avisoOculto.set(false);

    const queryParams: Record<string, string> = {};
    if (motivo) queryParams['expirada'] = '1';
    if (volverA && volverA !== '/login') queryParams['returnUrl'] = volverA;
    this.router.navigate(['/login'], { queryParams });
  }

  /** Oculta el aviso de expiración hasta la siguiente sesión. */
  ocultarAviso(): void {
    this.avisoOculto.set(true);
  }

  /** Consulta los datos del usuario autenticado directamente del servidor. */
  obtenerPerfil(): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(`${this.url}/me`);
  }

  /** Token vigente o null si no hay sesión o ya venció. */
  token(): string | null {
    const sesion = this.sesionActual();
    return sesion && Date.now() < sesion.expiraEn ? sesion.token : null;
  }

  /** true si el usuario tiene el permiso (lee un signal: es reactivo). */
  tienePermiso(permiso: Permiso): boolean {
    return this.sesionActual()?.permisos.includes(permiso) ?? false;
  }

  private iniciar(sesion: Sesion): void {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.avisoOculto.set(false);
    this.sesionActual.set(sesion);
    this.programarExpiracion(sesion);
  }

  private programarExpiracion(sesion: Sesion): void {
    clearTimeout(this.temporizador);
    if (this.intervaloSegundos) {
      clearInterval(this.intervaloSegundos);
    }

    const actualizarSegundos = () => {
      const restantes = Math.max(0, Math.floor((sesion.expiraEn - Date.now()) / 1000));
      this.segundosRestantes.set(restantes);
      if (restantes <= 0) {
        clearInterval(this.intervaloSegundos);
        this.intervaloSegundos = undefined;
        this.cerrarSesion('expirada', this.router.url);
      }
    };

    actualizarSegundos();
    this.intervaloSegundos = setInterval(actualizarSegundos, 1000);
  }

  /** Recupera la sesión tras recargar la página; descarta la vencida o dañada. */
  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as Sesion;
      if (!sesion.token || Date.now() >= sesion.expiraEn) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }
}
