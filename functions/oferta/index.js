// /oferta/ — statyczny HTML z buildu + treści z panelu (zasady i koszty, materiały firmy, własność strony).
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
