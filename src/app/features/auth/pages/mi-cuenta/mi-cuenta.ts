import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth-service';
import { PerfilUsuario, Permiso } from '../../../../core/auth/auth.model';

interface PermisoItem {
  clave: Permiso;
  nombre: string;
  descripcion: string;
}

interface ModuloPermisos {
  nombre: string;
  icono: string;
  permisos: PermisoItem[];
}

@Component({
  selector: 'app-mi-cuenta',
  imports: [CommonModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta implements OnInit {
  protected readonly auth = inject(AuthService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly perfil = signal<PerfilUsuario | null>(null);

  readonly modulos: ModuloPermisos[] = [
    {
      nombre: 'Catálogo',
      icono: '📦',
      permisos: [
        { clave: 'CATALOGO_LEER', nombre: 'Leer Catálogo', descripcion: 'Consultar productos y categorías' },
        { clave: 'CATALOGO_ESCRIBIR', nombre: 'Modificar Catálogo', descripcion: 'Crear, editar y dar de baja productos o categorías' },
      ],
    },
    {
      nombre: 'Clientes',
      icono: '👥',
      permisos: [
        { clave: 'CLIENTES_LEER', nombre: 'Leer Clientes', descripcion: 'Consultar listado y datos de clientes' },
        { clave: 'CLIENTES_ESCRIBIR', nombre: 'Registrar Clientes', descripcion: 'Crear y actualizar datos de clientes' },
      ],
    },
    {
      nombre: 'Ventas',
      icono: '🛒',
      permisos: [
        { clave: 'VENTAS_LEER', nombre: 'Consultar Ventas', descripcion: 'Visualizar listado e historial de ventas' },
        { clave: 'VENTAS_REGISTRAR', nombre: 'Registrar Ventas', descripcion: 'Emitir y registrar ventas y comprobantes' },
      ],
    },
    {
      nombre: 'Reportes',
      icono: '📊',
      permisos: [
        { clave: 'REPORTES_VER', nombre: 'Ver Reportes', descripcion: 'Consultar reportes estadísticos del negocio' },
      ],
    },
    {
      nombre: 'Usuarios',
      icono: '⚙️',
      permisos: [
        { clave: 'USUARIOS_ADMINISTRAR', nombre: 'Administrar Usuarios', descripcion: 'Gestionar usuarios, roles y accesos' },
      ],
    },
  ];

  readonly permisosDiscrepantes = computed(() => {
    const p = this.perfil();
    const s = this.auth.sesion();
    if (!p || !s) return false;
    const sesionPermisos = new Set(s.permisos || []);
    const backendPermisos = new Set(p.permisos || []);
    if (sesionPermisos.size !== backendPermisos.size) return true;
    for (const perm of sesionPermisos) {
      if (!backendPermisos.has(perm)) return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.auth.obtenerPerfil().subscribe({
      next: (datos) => {
        if (!datos.nombreCompleto && datos.empleadoNombre) {
          datos.nombreCompleto = datos.empleadoNombre;
        }
        this.perfil.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(
          err.status === 401
            ? 'Su sesión expiró o el token no es válido.'
            : 'No se pudo obtener la información de perfil desde el servidor.'
        );
      },
    });
  }

  tienePermiso(clave: Permiso): boolean {
    const p = this.perfil();
    return p ? (p.permisos || []).includes(clave) : false;
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
