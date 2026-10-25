// /o-mnie/ — statyczny HTML z buildu + treści z panelu (wartości współpracy, e-mail, profile).
import { renderPage } from '../_lib/page.js';

export const onRequestGet = (context) => renderPage(context);
