import { Routes } from '@angular/router';
import { ClienteList } from './pages/cliente-list/cliente-list';

export const CLIENTES_ROUTES: Routes = [
  { path: '', component: ClienteList, title: 'Clientes' },
];
