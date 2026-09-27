import { Routes } from '@angular/router';
import { CategoriaList } from './pages/categoria-list/categoria-list';

export const CATEGORIAS_ROUTES: Routes = [
  { path: '', component: CategoriaList, title: 'Categorías' },
];

