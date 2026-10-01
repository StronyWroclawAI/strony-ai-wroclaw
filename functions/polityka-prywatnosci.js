// Polityka prywatności: statyczny HTML + dane uzupełniane w panelu.
import { renderPage } from './_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
