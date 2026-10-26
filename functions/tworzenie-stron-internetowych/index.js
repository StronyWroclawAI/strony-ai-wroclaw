// /tworzenie-stron-internetowych/ — ogólnopolska strona usługowa (statyczny HTML z buildu + treści i tryb oferty z panelu).
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
