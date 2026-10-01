// Strona główna: statyczny HTML + treści z panelu (po stronie serwera).
import { renderPage } from './_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
