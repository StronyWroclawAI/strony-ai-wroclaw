// /poradnik/ i artykuły poradnika — statyczne pliki HTML z public/poradnik/…, uzupełniane danymi z panelu
// (e-mail, linki do profili, widoczność pozycji menu). Nieznany adres zwraca 404 z serwera plików.
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
