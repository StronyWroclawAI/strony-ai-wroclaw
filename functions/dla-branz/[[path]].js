// /dla-branz/ i strony branżowe — statyczne pliki HTML z public/dla-branz/…, uzupełniane danymi z panelu.
// Nieznany adres zwraca 404 z serwera plików.
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
