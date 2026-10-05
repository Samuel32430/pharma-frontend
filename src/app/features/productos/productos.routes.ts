import {Routes} from '@angular/router';
import {ProductoList} from './pages/producto-list/producto-list';
import {ProductoForm} from './pages/producto-form/producto-form';

export const PRODUCTOS_ROUTES: Routes = [
    {
        path: '',
        title: 'Productos',
        component: ProductoList,
    },
    {
        path: 'nuevo',
        title: 'Nuevo Producto',
        component: ProductoForm,
    },
    {
        path: ':id/editar',
        title: 'Editar Producto',
        component: ProductoForm,
    }
]