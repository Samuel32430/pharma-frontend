import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth-service';

@Component({
  selector: 'app-aviso-sesion',
  templateUrl: './aviso-sesion.html',
  styleUrl: './aviso-sesion.css',
})
export class AvisoSesion {
  protected readonly auth = inject(AuthService);

  readonly tiempoRestante = computed(() => {
    const s = this.auth.segundosRestantes();
    const min = Math.floor(s / 60);
    const seg = s % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  });

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

  ocultar(): void {
    this.auth.ocultarAviso();
  }
}
