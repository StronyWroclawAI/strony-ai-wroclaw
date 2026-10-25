// /kontakt/ — formularz zgłoszenia (ten sam co na stronie głównej, wysyłany do /api/zgloszenie) + treści z panelu.
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
