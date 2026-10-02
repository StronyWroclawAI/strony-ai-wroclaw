/* =========================================================
   Brief projektowy — Strony AI Wrocław
   Definicja wszystkich pytań. Ten sam plik wykorzystuje:
   - formularz dla klienta (/brief/…),
   - panel administratora (podgląd, druk, eksport dla AI).
   Typy pól: text, email, tel, url, textarea, radio, checkbox, select, info (sam tekst).
   showIf: pole pokazuje się tylko, gdy warunek jest spełniony:
     f + eq / in / has / not — odpowiedź na inne pole,
     p / notp — profil branży (np. 'gastro'), ind / notind — konkretna branża.
   requiredIf: pole wymagane tylko, gdy warunek jest spełniony.
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------- Skróty ---------- */
  /** O('wartosc|Etykieta|podpowiedź', …) → lista opcji */
  function O() {
    return Array.prototype.map.call(arguments, function (s) {
      var p = s.split('|');
      var r = { v: p[0], l: p[1] };
      if (p[2]) r.h = p[2];
      return r;
    });
  }

  /* =========================================================
     BRANŻE
     Każda branża ma: v (identyfikator), l (nazwa), p (profil pytań),
     k (słowa kluczowe — do automatycznego rozpoznania branży ze zgłoszenia).
     Pytania w kroku „Pytania branżowe” pokazują się według profilu (showIf.p)
     albo konkretnej branży (showIf.ind).
     ========================================================= */
  var PROFILES = {
    gastro: { l: 'Gastronomia', rec: ['menu', 'godziny', 'mapa', 'galeria', 'zamowienia', 'opinie', 'o_nas', 'kontakt'] },
    noclegi: { l: 'Noclegi', rec: ['pokoje', 'udogodnienia', 'galeria', 'cennik', 'okolica', 'mapa', 'opinie', 'faq', 'regulamin', 'kontakt'] },
    uroda: { l: 'Uroda', rec: ['oferta', 'cennik', 'zespol', 'realizacje', 'opinie', 'vouchery', 'regulamin', 'przed_wizyta', 'pielegnacja'] },
    tatuaz: { l: 'Tatuaż i piercing', rec: ['zespol', 'realizacje', 'flash', 'pielegnacja', 'faq', 'regulamin', 'wycena', 'opinie'] },
    zdrowie: { l: 'Zdrowie', rec: ['zespol', 'oferta', 'cennik', 'przed_wizyta', 'faq', 'dostepnosc', 'mapa', 'certyfikaty'] },
    sport: { l: 'Sport i rekreacja', rec: ['grafik', 'cennik', 'pakiety', 'zespol', 'galeria', 'faq', 'opinie'] },
    edukacja: { l: 'Edukacja', rec: ['kursy', 'cennik', 'zespol', 'grafik', 'faq', 'opinie'] },
    auto: { l: 'Motoryzacja', rec: ['oferta', 'cennik', 'realizacje', 'godziny', 'mapa', 'wycena', 'opinie'] },
    budowa: { l: 'Budownictwo i dom', rec: ['oferta', 'realizacje', 'proces', 'obszar', 'wycena', 'certyfikaty', 'opinie', 'faq'] },
    uslugi: { l: 'Usługi', rec: ['oferta', 'cennik', 'obszar', 'wycena', 'faq', 'opinie'] },
    biuro: { l: 'Usługi profesjonalne', rec: ['oferta', 'zespol', 'proces', 'faq', 'aktualnosci', 'certyfikaty', 'wycena'] },
    kreatywne: { l: 'Branża kreatywna', rec: ['realizacje', 'oferta', 'pakiety', 'proces', 'kalendarz', 'opinie', 'faq'] },
    eventy: { l: 'Wydarzenia i rozrywka', rec: ['oferta', 'galeria', 'pakiety', 'kalendarz', 'wideo', 'faq', 'opinie', 'mapa'] },
    handel: { l: 'Handel i produkcja', rec: ['oferta', 'oferty', 'godziny', 'mapa', 'promocje', 'zamowienia', 'marki'] },
    zwierzeta: { l: 'Zwierzęta', rec: ['oferta', 'cennik', 'zespol', 'przed_wizyta', 'godziny', 'mapa', 'faq'] },
    turystyka: { l: 'Turystyka i transport', rec: ['oferta', 'kalendarz', 'cennik', 'flota', 'okolica', 'faq', 'regulamin', 'galeria'] },
    ngo: { l: 'Organizacje i kultura', rec: ['o_nas', 'aktualnosci', 'wsparcie', 'partnerzy', 'sprawozdania', 'kalendarz', 'galeria'] },
  };

  function I(v, l, p, k) { return { v: v, l: l, p: p, k: k }; }

  var INDUSTRY_GROUPS = [
    { l: 'Gastronomia', items: [
      I('restauracja', 'Restauracja', 'gastro', ['restaurac']),
      I('pizzeria', 'Pizzeria', 'gastro', ['pizz']),
      I('bistro', 'Bistro / burgerownia / bar szybkiej obsługi', 'gastro', ['bistro', 'burger', 'kebab', 'fast food', 'bar mleczn', 'zapiekank']),
      I('sushi', 'Sushi / kuchnia azjatycka', 'gastro', ['sushi', 'azjat', 'ramen', 'wietnam', 'tajsk', 'chinsk']),
      I('kawiarnia', 'Kawiarnia', 'gastro', ['kawiar', 'kawa', 'cafe', 'coffee', 'herbaciar']),
      I('cukiernia', 'Cukiernia / piekarnia / pracownia tortów', 'gastro', ['cukier', 'piekar', 'tort', 'ciast', 'wypiek']),
      I('lodziarnia', 'Lodziarnia / deserownia', 'gastro', ['lodziar', 'lody', 'deser', 'gofr']),
      I('bar_pub', 'Bar / pub / klub muzyczny', 'gastro', ['pub', 'bar', 'piwiar', 'koktajl', 'klub muzycz']),
      I('food_truck', 'Food truck', 'gastro', ['food truck', 'foodtruck']),
      I('catering', 'Catering / dieta pudełkowa', 'gastro', ['catering', 'katering', 'diet pudel', 'pudelk']),
    ] },
    { l: 'Noclegi', items: [
      I('hotel', 'Hotel', 'noclegi', ['hotel']),
      I('hostel', 'Hostel', 'noclegi', ['hostel']),
      I('pensjonat', 'Pensjonat / pokoje gościnne / guest house', 'noclegi', ['pensjonat', 'guest house', 'pokoje goscin', 'kwater', 'nocleg']),
      I('apartamenty', 'Apartamenty na wynajem krótkoterminowy', 'noclegi', ['apartament', 'wynajem krotkotermin']),
      I('agroturystyka', 'Agroturystyka', 'noclegi', ['agroturyst']),
      I('domki', 'Domki letniskowe / glamping / camping', 'noclegi', ['domk', 'glamping', 'camping', 'kemping', 'pole namiot']),
      I('osrodek', 'Ośrodek wypoczynkowy / konferencyjny', 'noclegi', ['osrodek', 'osrodk']),
    ] },
    { l: 'Uroda', items: [
      I('fryzjer', 'Salon fryzjerski', 'uroda', ['fryzj', 'wlos']),
      I('barber', 'Barber shop', 'uroda', ['barber', 'golibrod']),
      I('kosmetyczka', 'Gabinet kosmetyczny', 'uroda', ['kosmetycz', 'kosmetyk', 'salon urody', 'uroda']),
      I('kosmetologia', 'Kosmetologia / medycyna estetyczna', 'uroda', ['kosmetolog', 'medycyn estetycz', 'estetycz']),
      I('paznokcie', 'Stylizacja paznokci / manicure', 'uroda', ['paznok', 'manicur', 'pedicur', 'nail']),
      I('rzesy_brwi', 'Stylizacja rzęs i brwi', 'uroda', ['rzes', 'brwi', 'lash']),
      I('makijaz', 'Makijażystka / wizaż', 'uroda', ['makijaz', 'wizaz', 'make up', 'makeup']),
      I('spa_masaz', 'SPA / salon masażu', 'uroda', ['spa', 'masaz', 'wellness']),
      I('solarium', 'Solarium', 'uroda', ['solarium']),
    ] },
    { l: 'Tatuaż i piercing', items: [
      I('tatuaz', 'Studio tatuażu', 'tatuaz', ['tatua', 'tattoo']),
      I('piercing', 'Studio piercingu', 'tatuaz', ['piercing', 'kolczykow']),
      I('pmu', 'Makijaż permanentny / linergistka', 'tatuaz', ['makijaz perman', 'permanent', 'linergist', 'pmu']),
    ] },
    { l: 'Zdrowie', items: [
      I('stomatolog', 'Gabinet stomatologiczny', 'zdrowie', ['stomatolog', 'dentyst', 'ortodont', 'implant']),
      I('lekarz', 'Gabinet lekarski / przychodnia', 'zdrowie', ['lekarz', 'lekars', 'przychod', 'klinik', 'poradni']),
      I('fizjoterapia', 'Fizjoterapia / rehabilitacja', 'zdrowie', ['fizjo', 'rehabilit', 'osteopat']),
      I('psycholog', 'Psycholog / psychoterapeuta', 'zdrowie', ['psycholog', 'psychoterap', 'terapeut']),
      I('dietetyk', 'Dietetyk', 'zdrowie', ['dietety']),
      I('logopeda', 'Logopeda / terapia dzieci', 'zdrowie', ['logoped', 'integracj sensor', 'neurologopet']),
      I('podolog', 'Podolog', 'zdrowie', ['podolog']),
      I('optyk', 'Optyk / optometrysta', 'zdrowie', ['optyk', 'optometr', 'okular']),
    ] },
    { l: 'Sport i rekreacja', items: [
      I('silownia', 'Siłownia / klub fitness', 'sport', ['silown', 'fitness', 'gym', 'crossfit']),
      I('trener', 'Trener personalny', 'sport', ['trener', 'trening personal']),
      I('joga', 'Studio jogi / pilates', 'sport', ['joga', 'jogi', 'yoga', 'pilates']),
      I('sztuki_walki', 'Sztuki walki / sporty walki', 'sport', ['sztuk walk', 'karate', 'judo', 'boks', 'mma', 'jiu', 'taekwondo', 'krav']),
      I('taniec', 'Szkoła tańca', 'sport', ['taniec', 'tanca', 'tance']),
      I('klub_sportowy', 'Klub sportowy / akademia piłkarska', 'sport', ['klub sport', 'akademi pilk', 'pilk nozn']),
      I('kort', 'Korty / squash / padel / ścianka wspinaczkowa', 'sport', ['wspinacz', 'squash', 'tenis', 'padel', 'kort']),
    ] },
    { l: 'Edukacja', items: [
      I('szkola_jezykowa', 'Szkoła językowa / lektor', 'edukacja', ['jezyk', 'lektor', 'angielsk', 'niemieck']),
      I('korepetycje', 'Korepetycje / centrum edukacyjne', 'edukacja', ['korepet', 'matemat', 'edukac']),
      I('przedszkole', 'Przedszkole / żłobek / klub malucha', 'edukacja', ['przedszk', 'zlob', 'klub maluch']),
      I('szkola_jazdy', 'Szkoła jazdy (OSK)', 'edukacja', ['szkol jazd', 'nauka jazd', 'osk', 'prawo jazd']),
      I('kursy', 'Kursy i szkolenia zawodowe', 'edukacja', ['kurs', 'szkolen']),
      I('muzyka', 'Szkoła muzyczna / lekcje gry i śpiewu', 'edukacja', ['muzycz', 'gitar', 'pianin', 'spiew', 'lekcj gry']),
      I('zajecia_dzieci', 'Zajęcia dodatkowe dla dzieci', 'edukacja', ['zajec dla dziec', 'zajec dodatk', 'robotyk', 'plastyczn']),
    ] },
    { l: 'Motoryzacja', items: [
      I('warsztat', 'Warsztat samochodowy / mechanik', 'auto', ['warsztat', 'mechani', 'serwis samoch', 'samochod']),
      I('wulkanizacja', 'Wulkanizacja / opony', 'auto', ['wulkaniz', 'opon']),
      I('myjnia', 'Myjnia / detailing', 'auto', ['myjni', 'detailing', 'auto spa']),
      I('blacharstwo', 'Blacharstwo i lakiernictwo', 'auto', ['blachar', 'lakier']),
      I('stacja_kontroli', 'Stacja kontroli pojazdów', 'auto', ['stacj kontrol', 'przeglad']),
      I('komis', 'Komis / sprzedaż samochodów', 'auto', ['komis', 'sprzedaz samoch', 'auto handel']),
      I('wypozyczalnia_aut', 'Wypożyczalnia samochodów / busów', 'auto', ['wypozyczal samoch', 'wynajem samoch', 'wynajem aut', 'wypozyczal aut', 'wynajem bus']),
      I('pomoc_drogowa', 'Pomoc drogowa / laweta', 'auto', ['pomoc drog', 'holow', 'lawet']),
      I('jednoslady', 'Serwis motocykli / rowerów / hulajnóg', 'auto', ['motocykl', 'rower', 'skuter', 'hulajn']),
    ] },
    { l: 'Budownictwo i dom', items: [
      I('budowlana', 'Firma budowlana / generalny wykonawca', 'budowa', ['budowl', 'budow', 'wykonawc']),
      I('remonty', 'Remonty i wykończenia wnętrz', 'budowa', ['remont', 'wykonczen', 'glazur', 'malarz', 'malowan', 'plytk']),
      I('elektryk', 'Elektryk', 'budowa', ['elektry']),
      I('hydraulik', 'Hydraulik / instalacje grzewcze', 'budowa', ['hydraul', 'instalac', 'grzewcz', 'kotl']),
      I('dekarz', 'Dekarz / pokrycia dachowe', 'budowa', ['dekar', 'dach']),
      I('stolarz', 'Stolarz / meble na wymiar', 'budowa', ['stolar', 'mebl', 'kuchnie na wymiar']),
      I('okna_drzwi', 'Okna, drzwi, rolety, bramy', 'budowa', ['okna', 'okien', 'drzwi', 'rolet', 'zaluz', 'bram']),
      I('fotowoltaika', 'Fotowoltaika / pompy ciepła / OZE', 'budowa', ['fotowolt', 'pomp ciepl', 'oze', 'solar']),
      I('klimatyzacja', 'Klimatyzacja i wentylacja', 'budowa', ['klimatyz', 'wentyl', 'rekuperac']),
      I('ogrody', 'Ogrody / zieleń / brukarstwo', 'budowa', ['ogrod', 'zielen', 'bruk', 'trawnik']),
      I('architekt', 'Architekt / projektant wnętrz', 'budowa', ['architek', 'projekt wnetrz', 'projektant wnetrz', 'aranzac']),
      I('geodeta', 'Geodeta / kierownik budowy / inspektor nadzoru', 'budowa', ['geode', 'kierownik budow', 'inspektor nadzor', 'swiadectw energet']),
    ] },
    { l: 'Usługi dla domu i firm', items: [
      I('sprzatanie', 'Sprzątanie / firma porządkowa', 'uslugi', ['sprzat', 'porzadk', 'czyszcz']),
      I('pranie', 'Pranie dywanów i tapicerki', 'uslugi', ['pranie', 'tapicer', 'dywan']),
      I('pralnia', 'Pralnia / pralnia chemiczna', 'uslugi', ['pralni']),
      I('przeprowadzki', 'Przeprowadzki / transport mebli', 'uslugi', ['przeprowadz']),
      I('zlota_raczka', 'Złota rączka / drobne naprawy', 'uslugi', ['zlota raczk', 'drobne napraw', 'handyman']),
      I('slusarz', 'Ślusarz / awaryjne otwieranie zamków', 'uslugi', ['slusar', 'otwieran zamk', 'zamk']),
      I('ddd', 'Dezynsekcja / deratyzacja (DDD)', 'uslugi', ['dezynsek', 'deratyz', 'ddd']),
      I('krawiec', 'Krawiec / szewc / pracownia napraw', 'uslugi', ['krawie', 'krawc', 'szewc']),
      I('serwis_elektroniki', 'Serwis AGD / RTV / telefonów / komputerów', 'uslugi', ['agd', 'rtv', 'serwis telef', 'naprawa telef', 'serwis komput', 'napraw komput']),
    ] },
    { l: 'Usługi profesjonalne', items: [
      I('ksiegowosc', 'Biuro rachunkowe / księgowość', 'biuro', ['ksiegow', 'rachunk', 'kadr', 'podatk']),
      I('prawnik', 'Kancelaria prawna (adwokat / radca prawny)', 'biuro', ['kancelar', 'adwokat', 'radca', 'prawn']),
      I('nieruchomosci', 'Biuro nieruchomości / zarządzanie najmem', 'biuro', ['nieruchom', 'posrednic', 'zarzadz najm']),
      I('ubezpieczenia', 'Ubezpieczenia / doradca kredytowy', 'biuro', ['ubezpiecz', 'kredyt', 'finans']),
      I('doradztwo', 'Doradztwo / coaching / konsulting', 'biuro', ['doradz', 'coach', 'konsult', 'mentor']),
      I('tlumacz', 'Biuro tłumaczeń / tłumacz przysięgły', 'biuro', ['tlumacz']),
      I('it', 'Usługi IT / informatyk / programista', 'biuro', ['informaty', 'programist', 'oprogramowan', 'uslugi it']),
      I('marketing', 'Agencja marketingowa / social media', 'biuro', ['marketing', 'agencj reklam', 'social media']),
      I('bhp', 'BHP / ppoż. / szkolenia dla firm', 'biuro', ['bhp', 'ppoz']),
      I('agencja_pracy', 'Agencja pracy / rekrutacja', 'biuro', ['rekrutac', 'agencj pracy', 'posrednictw pracy']),
    ] },
    { l: 'Branża kreatywna', items: [
      I('fotograf', 'Fotograf', 'kreatywne', ['fotograf', 'sesj zdjec', 'sesje zdjec']),
      I('filmowiec', 'Filmowanie / wideo / dron', 'kreatywne', ['film', 'wideo', 'video', 'dron', 'kamerzyst']),
      I('grafik', 'Grafik / projektant / identyfikacja wizualna', 'kreatywne', ['grafik', 'projektant grafi', 'ilustrat', 'logo']),
      I('dj_muzyk', 'DJ / zespół muzyczny / wodzirej', 'kreatywne', ['dj', 'zespol muz', 'wodzirej', 'muzyk']),
      I('artysta', 'Artysta / rękodzieło / pracownia artystyczna', 'kreatywne', ['rekodziel', 'artyst', 'ceramik', 'handmade']),
      I('drukarnia', 'Drukarnia / reklama wizualna / oklejanie', 'kreatywne', ['drukarn', 'druk', 'oklej', 'szyld', 'reklam wizual']),
      I('studio_nagran', 'Studio nagrań / podcasty', 'kreatywne', ['studio nagran', 'podcast', 'nagran']),
    ] },
    { l: 'Wydarzenia i rozrywka', items: [
      I('sala_weselna', 'Sala weselna / bankietowa', 'eventy', ['sala wesel', 'wesel', 'bankiet', 'sala przyjec']),
      I('wedding_planner', 'Organizacja wesel i eventów', 'eventy', ['wedding', 'organizac wesel', 'organizac event', 'event', 'konsultant slub']),
      I('animatorzy', 'Animacje dla dzieci / urodziny', 'eventy', ['animac', 'animator', 'urodzin dla dzieci']),
      I('wynajem_event', 'Wynajem na imprezy (dekoracje, namioty, fotobudka)', 'eventy', ['fotobud', 'namiot', 'dekorac', 'wynajem na impre']),
      I('escape_room', 'Escape room', 'eventy', ['escape', 'pokoj zagadek']),
      I('sala_zabaw', 'Sala zabaw / park trampolin', 'eventy', ['sala zabaw', 'trampolin', 'plac zabaw']),
      I('rozrywka', 'Kręgle / bilard / gokarty / paintball', 'eventy', ['kregl', 'bilard', 'gokart', 'paintball', 'laser tag', 'rozrywk']),
    ] },
    { l: 'Handel i produkcja', items: [
      I('sklep', 'Sklep stacjonarny', 'handel', ['sklep']),
      I('sklep_online', 'Sklep internetowy (e-commerce)', 'handel', ['sklep internet', 'e-commerce', 'ecommerce', 'sklep online']),
      I('kwiaciarnia', 'Kwiaciarnia / florystka', 'handel', ['kwiat', 'kwiaciar', 'florys']),
      I('butik', 'Butik / odzież / obuwie', 'handel', ['butik', 'odziez', 'obuw', 'moda']),
      I('jubiler', 'Jubiler / zegarmistrz', 'handel', ['jubiler', 'zegarmistrz', 'bizuter']),
      I('delikatesy', 'Delikatesy / sklep spożywczy / produkty regionalne', 'handel', ['delikates', 'spozywcz', 'produkty regional']),
      I('meble_wnetrza', 'Salon meblowy / wyposażenie wnętrz', 'handel', ['salon mebl', 'wyposazen wnetrz']),
      I('hurtownia', 'Hurtownia / dystrybucja', 'handel', ['hurtown', 'dystrybuc']),
      I('producent', 'Producent / manufaktura', 'handel', ['producent', 'produkcj', 'manufaktur', 'wytworn']),
    ] },
    { l: 'Zwierzęta', items: [
      I('weterynarz', 'Gabinet weterynaryjny', 'zwierzeta', ['weteryn']),
      I('groomer', 'Groomer / salon dla psów', 'zwierzeta', ['groom', 'strzyzen psow', 'psi fryz']),
      I('opieka_zwierzeta', 'Hotel dla zwierząt / pet sitting / wyprowadzanie psów', 'zwierzeta', ['hotel dla zwierz', 'hotel dla psow', 'pet sit', 'petsit', 'wyprowadzan psow', 'opiek nad zwierz']),
      I('szkolenie_psow', 'Szkolenie psów / behawiorysta', 'zwierzeta', ['szkolen psow', 'behawior', 'tresur']),
      I('sklep_zoo', 'Sklep zoologiczny', 'zwierzeta', ['zoolog']),
      I('hodowla', 'Hodowla (zarejestrowana)', 'zwierzeta', ['hodowl']),
      I('stajnia', 'Stajnia / jazda konna / hipoterapia', 'zwierzeta', ['stajni', 'jazd konn', 'jezdziec', 'hipoterap']),
    ] },
    { l: 'Turystyka i transport', items: [
      I('biuro_podrozy', 'Biuro podróży / organizator wycieczek', 'turystyka', ['biuro podroz', 'wycieczk', 'organizator turyst']),
      I('przewodnik', 'Przewodnik / atrakcja turystyczna', 'turystyka', ['przewodni', 'zwiedzan', 'atrakcj']),
      I('wypozyczalnia', 'Wypożyczalnia sprzętu (rowery, kajaki, narty)', 'turystyka', ['wypozyczal', 'kajak', 'narty']),
      I('szkola_sportow', 'Szkoła żeglarstwa / nurkowania / narciarska', 'turystyka', ['zeglar', 'nurkow', 'narciar', 'surf']),
      I('przewoz_osob', 'Przewóz osób / transfery / taxi', 'turystyka', ['przewoz osob', 'transfer', 'taxi', 'taksow', 'busy']),
      I('transport', 'Transport / spedycja / logistyka', 'turystyka', ['transport', 'spedyc', 'logisty', 'kurier']),
    ] },
    { l: 'Organizacje i kultura', items: [
      I('fundacja', 'Fundacja / stowarzyszenie', 'ngo', ['fundac', 'stowarzysz', 'organizac pozarzad', 'ngo']),
      I('kultura', 'Dom kultury / galeria / teatr / muzeum', 'ngo', ['dom kultur', 'galeri sztuk', 'teatr', 'muzeum', 'kino']),
    ] },
    { l: 'Inne', items: [I('inna', 'Inna branża (opiszę poniżej)', '_brak', [])] },
  ];

  var INDUSTRY_INDEX = {};
  INDUSTRY_GROUPS.forEach(function (g) { g.items.forEach(function (i) { INDUSTRY_INDEX[i.v] = i; }); });

  /* =========================================================
     PYTANIA BRANŻOWE (krok 2)
     ========================================================= */
  var ETHICS_INFO = 'Strony lekarzy, lekarzy dentystów, adwokatów i radców prawnych podlegają zasadom etyki zawodowej, które ograniczają reklamę. Przygotuję treści o charakterze informacyjnym (bez promocji cenowych i obietnic efektów) — przed publikacją warto, żebyś je sprawdził pod kątem zasad Twojego samorządu zawodowego.';

  var INDUSTRY_FIELDS = [
    { id: 'ind_none_info', type: 'info', showIf: { p: ['', '_brak'] }, text: 'Nie wybrałeś branży z listy w kroku 1, więc poniżej są pytania ogólne. Jeśli Twoja branża jest na liście — wróć do kroku 1 i ją wybierz, a pytania dopasują się automatycznie.' },
    { id: 'ind_specific', type: 'textarea', label: 'Co jest szczególnego w Twojej branży?', hint: 'Czego klient musi się dowiedzieć ze strony, jakie informacje są w Twojej branży kluczowe, jak wygląda współpraca krok po kroku.', showIf: { p: ['', '_brak'] }, max: 3000 },
    { id: 'ind_ethics_info', type: 'info', showIf: { ind: ['lekarz', 'stomatolog', 'prawnik'] }, text: ETHICS_INFO },
    { id: 'ind_aesthetic_info', type: 'info', showIf: { ind: ['kosmetologia'] }, text: 'Zabiegi medycyny estetycznej wykonywane przez lekarza podlegają zasadom etyki lekarskiej, które ograniczają reklamę. Opisy takich zabiegów przygotuję w formie informacyjnej, bez obietnic efektów.' },

    /* ----- Gastronomia ----- */
    { id: 'gas_cuisine', type: 'text', label: 'Rodzaj kuchni / specjalność lokalu', placeholder: 'np. włoska, wegańska, burgery smash, kawa speciality, domowe obiady', showIf: { p: ['gastro'] }, max: 300 },
    { id: 'gas_menu_form', type: 'radio', label: 'Jak pokazać menu na stronie?', required: true, other: true, showIf: { p: ['gastro'] },
      options: O('pelne|Pełne menu z cenami, edytowane w panelu', 'wybrane|Wybrane dania + pełne menu w PDF', 'pdf|Tylko menu w PDF do pobrania', 'zdjecia|Karta jako zdjęcia (np. tablica w lokalu)', 'brak|Bez menu — opis oferty') },
    { id: 'gas_menu_changes', type: 'radio', label: 'Jak często zmienia się menu?', showIf: { p: ['gastro'] },
      options: O('rzadko|Rzadko (kilka razy w roku)', 'sezonowo|Sezonowo', 'tydzien|Co tydzień', 'codziennie|Codziennie (np. lunch dnia)') },
    { id: 'gas_menu_details', type: 'checkbox', label: 'Co pokazać przy daniach?', other: true, showIf: { p: ['gastro'] },
      options: O('opis|Krótki opis / składniki', 'zdjecia|Zdjęcia dań', 'gramatura|Gramatura / wielkość porcji', 'alergeny|Alergeny', 'oznaczenia|Oznaczenia: wege, wegańskie, bezglutenowe, ostre', 'napoje|Karta napojów / alkoholi', 'lunch|Zestaw lunchowy / danie dnia', 'dzieci|Menu dla dzieci') },
    { id: 'gas_orders', type: 'checkbox', label: 'Zamówienia i dostawa', other: true, showIf: { p: ['gastro'] },
      options: O('na_miejscu|Tylko na miejscu', 'wynos|Na wynos — zamówienie telefoniczne', 'dowoz_wlasny|Własny dowóz', 'pyszne|Pyszne.pl', 'glovo|Glovo', 'uber_wolt|Uber Eats / Wolt', 'online|Zamówienia online na stronie|Większa funkcja — osobne ustalenie zakresu i kosztów.') },
    { id: 'gas_delivery_area', type: 'text', label: 'Obszar i warunki dowozu', placeholder: 'np. do 5 km, minimalne zamówienie 50 zł, dowóz 8 zł', showIf: { f: 'gas_orders', has: 'dowoz_wlasny' }, max: 300 },
    { id: 'gas_tables', type: 'radio', label: 'Rezerwacja stolików', other: true, showIf: { p: ['gastro'], notind: ['food_truck', 'catering'] },
      options: O('telefon|Telefonicznie', 'formularz|Formularz „zarezerwuj stolik” — potwierdzam ręcznie', 'system|Przez zewnętrzny system rezerwacji (podam link)', 'brak|Nie przyjmujemy rezerwacji') },
    { id: 'gas_extras', type: 'checkbox', label: 'Co jeszcze oferujesz?', other: true, showIf: { p: ['gastro'] },
      options: O('imprezy|Imprezy okolicznościowe', 'sala|Wynajem sali / zamknięcie lokalu', 'catering|Catering', 'firmy|Lunche / obiady dla firm', 'vouchery|Vouchery podarunkowe', 'ogrodek|Ogródek / taras', 'dzieci|Kącik dla dzieci', 'zwierzeta|Przyjazne zwierzętom', 'parking|Parking', 'dostepnosc|Lokal bez barier') },
    { id: 'gas_cakes', type: 'checkbox', label: 'Zamówienia indywidualne', other: true, showIf: { ind: ['cukiernia', 'lodziarnia'] },
      options: O('torty|Torty na zamówienie', 'okolicznosciowe|Słodki stół / wypieki okolicznościowe', 'swieta|Zamówienia świąteczne', 'hurt|Dostawy dla kawiarni / sklepów', 'bez|Wyroby bezglutenowe / bez cukru / wegańskie') },
    { id: 'gas_cakes_lead', type: 'text', label: 'Z jakim wyprzedzeniem przyjmujesz zamówienia?', placeholder: 'np. torty — min. 5 dni, zadatek 30%', showIf: { ind: ['cukiernia'] }, max: 300 },
    { id: 'gas_catering', type: 'checkbox', label: 'Rodzaj cateringu', other: true, showIf: { ind: ['catering'] },
      options: O('okolicznosciowy|Okolicznościowy (komunie, chrzciny, stypy)', 'firmowy|Firmowy (spotkania, konferencje)', 'lunche|Codzienne lunche do firm', 'dieta|Dieta pudełkowa', 'grill|Grill / food stoisko na eventach') },
    { id: 'gas_catering_rules', type: 'text', label: 'Minimalne zamówienie i obszar dostaw', placeholder: 'np. od 10 osób, Wrocław i okolice do 30 km', showIf: { ind: ['catering'] }, max: 300 },
    { id: 'gas_truck', type: 'radio', label: 'Gdzie można Cię znaleźć?', showIf: { ind: ['food_truck'] },
      options: O('stale|Stałe miejsce', 'zmienne|Zmieniam lokalizacje — chcę kalendarz miejsc i godzin', 'eventy|Głównie eventy i wynajem na imprezy') },
    { id: 'gas_bar', type: 'checkbox', label: 'Wydarzenia w lokalu', other: true, showIf: { ind: ['bar_pub'] },
      options: O('koncerty|Koncerty', 'dj|Imprezy z DJ-em', 'mecze|Transmisje sportowe', 'quizy|Quizy / karaoke / stand-up', 'degustacje|Degustacje') },

    /* ----- Noclegi ----- */
    { id: 'noc_units', type: 'text', label: 'Ile masz pokoi / apartamentów / miejsc noclegowych?', placeholder: 'np. 12 pokoi, 30 miejsc', showIf: { p: ['noclegi'] }, max: 200 },
    { id: 'noc_room_types', type: 'textarea', label: 'Rodzaje pokoi / obiektów', hint: 'np. 2-os. standard, 4-os. rodzinny, apartament z aneksem kuchennym, domek 6-os.', showIf: { p: ['noclegi'] }, max: 2000 },
    { id: 'noc_room_pages', type: 'radio', label: 'Jak pokazać pokoje?', showIf: { p: ['noclegi'] },
      options: O('osobno|Każdy pokój / apartament osobno — opis, wyposażenie, galeria', 'typy|Według typów pokoi', 'ogolnie|Ogólnie — jedna galeria obiektu') },
    { id: 'noc_booking', type: 'radio', label: 'Jak goście mają rezerwować?', required: true, other: true, showIf: { p: ['noclegi'] },
      options: O('silnik|Mam silnik rezerwacji / channel manager (np. Profitroom, Hotres, KWHotel) — osadzimy go na stronie', 'booking|Przez Booking.com (link do obiektu)', 'airbnb|Przez Airbnb (link do ogłoszenia)', 'formularz|Formularz zapytania o dostępność — odpowiadam ręcznie', 'telefon|Telefonicznie / e-mailem', 'wlasny|Chcę własny system rezerwacji|Duża funkcja — osobne ustalenie zakresu i kosztów.') },
    { id: 'noc_booking_link', type: 'url', label: 'Link do silnika rezerwacji / obiektu', showIf: { f: 'noc_booking', in: ['silnik', 'booking', 'airbnb'] }, max: 500 },
    { id: 'noc_direct', type: 'radio', label: 'Czy zachęcać do rezerwacji bezpośrednich (bez prowizji portali)?', showIf: { p: ['noclegi'] },
      options: O('tak|Tak — np. informacja o korzyściach rezerwacji bezpośredniej', 'nie|Nie', 'nie_wiem|Nie wiem — proszę o rekomendację') },
    { id: 'noc_guests', type: 'checkbox', label: 'Kim są Twoi goście?', other: true, showIf: { p: ['noclegi'] },
      options: O('turysci|Turyści z Polski', 'zagraniczni|Goście z zagranicy', 'biznes|Podróże służbowe', 'rodziny|Rodziny z dziećmi', 'pary|Pary', 'grupy|Grupy / wycieczki', 'pracownicy|Pracownicy (kwatery pracownicze)', 'mlodzi|Młodzi podróżnicy / backpackerzy') },
    { id: 'noc_amenities', type: 'checkbox', label: 'Udogodnienia do pokazania', other: true, showIf: { p: ['noclegi'] },
      options: O('wifi|Wi-Fi', 'parking|Parking', 'sniadania|Śniadania', 'restauracja|Restauracja / wyżywienie', 'kuchnia|Kuchnia / aneks dla gości', 'klimatyzacja|Klimatyzacja', 'zwierzeta|Przyjazne zwierzętom', 'dzieci|Udogodnienia dla dzieci / plac zabaw', 'spa|Basen / sauna / SPA', 'konferencje|Sale konferencyjne', 'rowery|Rowery / sprzęt do wypożyczenia', 'recepcja|Recepcja 24h', 'samoobsluga|Samodzielne zameldowanie (skrytka / kod)', 'dostepnosc|Pokoje bez barier', 'grill|Ogród / grill / ognisko', 'ladowarka|Ładowarka do aut elektrycznych') },
    { id: 'noc_rules', type: 'checkbox', label: 'Informacje praktyczne dla gości', other: true, showIf: { p: ['noclegi'] },
      options: O('godziny|Godziny zameldowania i wymeldowania', 'anulacja|Zasady anulacji', 'zaliczka|Zaliczka / przedpłata', 'oplata|Opłata miejscowa / klimatyczna', 'zwierzeta|Zasady i opłaty za zwierzęta', 'regulamin|Regulamin obiektu / cisza nocna', 'faktury|Faktury dla firm', 'dojazd|Dojazd i parking') },
    { id: 'noc_prices', type: 'radio', label: 'Jak pokazać ceny?', showIf: { p: ['noclegi'] },
      options: O('stale|Stały cennik', 'sezony|Cennik sezonowy (sezon / poza sezonem / święta)', 'od|Ceny „od…” i odesłanie do rezerwacji', 'brak|Bez cen — tylko zapytanie') },
    { id: 'noc_surroundings', type: 'textarea', label: 'Okolica i atrakcje', hint: 'Odległości (centrum, dworzec, lotnisko, jezioro, szlaki, stok), co polecasz gościom.', showIf: { p: ['noclegi'] }, max: 2000 },
    { id: 'noc_hostel', type: 'checkbox', label: 'Hostel — co oferujesz?', other: true, showIf: { ind: ['hostel'] },
      options: O('dormy|Sale wieloosobowe', 'damskie|Sale tylko dla kobiet', 'prywatne|Pokoje prywatne', 'kuchnia|Wspólna kuchnia', 'pralnia|Pralnia', 'szafki|Szafki / lockery', 'bagaz|Przechowalnia bagażu', 'eventy|Wspólne wydarzenia / strefa wspólna') },
    { id: 'noc_hotel', type: 'checkbox', label: 'Hotel / ośrodek — dodatkowa oferta', other: true, showIf: { ind: ['hotel', 'osrodek'] },
      options: O('restauracja|Restauracja otwarta dla gości z zewnątrz', 'konferencje|Konferencje i szkolenia', 'wesela|Wesela i przyjęcia', 'spa|SPA dla gości z zewnątrz', 'pakiety|Pakiety pobytowe (romantyczny, weekendowy, świąteczny)', 'vouchery|Vouchery podarunkowe') },
    { id: 'noc_agro', type: 'checkbox', label: 'Atrakcje na miejscu', other: true, showIf: { ind: ['agroturystyka', 'domki'] },
      options: O('zwierzeta|Zwierzęta gospodarskie', 'produkty|Produkty z gospodarstwa', 'plac|Plac zabaw', 'woda|Jezioro / rzeka / las w pobliżu', 'sprzet|Rowery / kajaki / łódki', 'ognisko|Ognisko / grill / wiata', 'warsztaty|Warsztaty / zajęcia dla gości', 'balia|Balia / sauna') },

    /* ----- Uroda ----- */
    { id: 'uro_categories', type: 'textarea', label: 'Główne kategorie usług / zabiegów', hint: 'np. strzyżenie, koloryzacja, zabiegi na twarz, depilacja, masaże — wystarczą nazwy kategorii.', showIf: { p: ['uroda'] }, max: 2000 },
    { id: 'uro_specialists', type: 'radio', label: 'Czy klient wybiera konkretną osobę?', showIf: { p: ['uroda', 'tatuaz'] },
      options: O('tak|Tak — pokażmy profile specjalistów i ich usługi', 'lista|Pokażmy zespół, ale bez wyboru osoby', 'sam|Pracuję sam / sama') },
    { id: 'uro_brands', type: 'text', label: 'Na jakich markach / kosmetykach pracujesz?', placeholder: 'np. L’Oréal Professionnel, Kérastase, Indigo', showIf: { p: ['uroda'] }, max: 300 },
    { id: 'uro_effects', type: 'radio', label: 'Zdjęcia efektów („przed i po”)', showIf: { p: ['uroda', 'tatuaz'] },
      hint: 'Pokażę wyłącznie zdjęcia, na których publikację klienci wyrazili zgodę.',
      options: O('mam|Mam zdjęcia i zgody klientów', 'instagram|Są na Instagramie — wybierzemy razem', 'zrobie|Zrobię nowe', 'nie|Nie pokazujemy efektów') },
    { id: 'uro_extras', type: 'checkbox', label: 'Dodatkowa oferta', other: true, showIf: { p: ['uroda'] },
      options: O('vouchery|Vouchery podarunkowe', 'karnety|Karnety / pakiety zabiegów', 'slub|Usługi ślubne / dojazd do klientki', 'produkty|Sprzedaż kosmetyków', 'szkolenia|Szkolenia dla innych stylistek', 'meskie|Usługi dla mężczyzn', 'dzieci|Usługi dla dzieci', 'konsultacje|Bezpłatne konsultacje') },
    { id: 'uro_prep', type: 'radio', label: 'Czy przed zabiegami są przeciwwskazania lub przygotowanie?', showIf: { p: ['uroda'] },
      options: O('tak|Tak — chcę sekcję „Przygotowanie i przeciwwskazania”', 'czesc|Tylko przy niektórych zabiegach (opiszę w uwagach)', 'nie|Nie') },
    { id: 'uro_rules', type: 'text', label: 'Zasady odwoływania wizyt i zadatków', placeholder: 'np. odwołanie min. 24 h wcześniej, zadatek 50 zł przy wizytach powyżej 2 h', showIf: { p: ['uroda', 'tatuaz'] }, max: 500 },
    { id: 'uro_walkin', type: 'radio', label: 'Czy przyjmujesz bez zapisów?', showIf: { ind: ['barber', 'fryzjer', 'solarium'] },
      options: O('tak|Tak, bez zapisów', 'czesciowo|Tak, jeśli jest wolne miejsce', 'nie|Tylko po wcześniejszym umówieniu') },
    { id: 'uro_aesthetic', type: 'radio', label: 'Kto wykonuje zabiegi medycyny estetycznej?', showIf: { ind: ['kosmetologia'] },
      options: O('lekarz|Lekarz', 'kosmetolog|Kosmetolog (zabiegi kosmetologiczne)', 'oba|Zespół: lekarz i kosmetolog', 'nie_dotyczy|Nie wykonujemy zabiegów medycznych') },

    /* ----- Tatuaż i piercing ----- */
    { id: 'tat_styles', type: 'checkbox', label: 'Style, w których pracujecie', other: true, showIf: { ind: ['tatuaz'] },
      options: O('realizm|Realizm / portrety', 'blackwork|Blackwork', 'fineline|Fineline / minimalizm', 'kolor|Kolor / new school', 'traditional|Old school / traditional', 'japonski|Japoński', 'liternictwo|Liternictwo', 'geometria|Geometria / dotwork / ornamenty', 'graficzny|Graficzny / ilustracyjny', 'coverup|Cover-up i poprawki starych tatuaży') },
    { id: 'tat_artists', type: 'textarea', label: 'Artyści w studiu', hint: 'Imię lub pseudonim, specjalizacja, link do Instagrama każdej osoby.', showIf: { p: ['tatuaz'] }, max: 2000 },
    { id: 'tat_portfolio', type: 'radio', label: 'Jak pokazać portfolio?', showIf: { p: ['tatuaz'] },
      options: O('artysci|Osobna galeria dla każdego artysty', 'style|Wspólna galeria podzielona na style', 'instagram|Wybrane prace + odnośnik do Instagrama') },
    { id: 'tat_contact', type: 'radio', label: 'Jak klient umawia tatuaż / zabieg?', required: true, other: true, showIf: { p: ['tatuaz'] },
      options: O('formularz|Formularz zapytania z opisem projektu — odpowiadam z wyceną i terminem', 'ig|Wiadomość na Instagramie', 'booksy|Booksy / system rezerwacji', 'telefon|Telefonicznie', 'konsultacja|Konsultacja w studiu') },
    { id: 'tat_form_fields', type: 'checkbox', label: 'Co klient ma podać w zapytaniu?', other: true, showIf: { f: 'tat_contact', eq: 'formularz' },
      options: O('opis|Opis pomysłu', 'miejsce|Miejsce na ciele', 'rozmiar|Przybliżony rozmiar', 'styl|Styl', 'artysta|Preferowany artysta', 'kolor|Kolor czy czarno-szary', 'termin|Preferowany termin', 'budzet|Budżet', 'zdjecia|Zdjęcia inspiracji|Przesyłanie plików wymaga dodatkowej konfiguracji — alternatywnie link lub wiadomość e-mail.') },
    { id: 'tat_pricing', legacy: true, type: 'radio', label: 'Jak informujesz o cenach?', other: true, showIf: { p: ['tatuaz'] },
      options: O('minimalna|Cena minimalna + wycena indywidualna', 'godzinowa|Stawka godzinowa / za sesję', 'cennik|Cennik (np. piercing, PMU)', 'indywidualnie|Tylko wycena indywidualna') },
    { id: 'tat_info', type: 'checkbox', label: 'Informacje dla klienta na stronie', other: true, showIf: { p: ['tatuaz'] },
      options: O('wiek|Zasady dotyczące wieku (18+ / zgoda rodzica)', 'zadatek|Zadatek i zasady przekładania terminów', 'przygotowanie|Jak przygotować się do sesji', 'gojenie|Pielęgnacja i gojenie', 'przeciwwskazania|Przeciwwskazania', 'higiena|Higiena i sterylizacja', 'vouchery|Vouchery podarunkowe', 'guest|Guest spoty / konwenty') },
    { id: 'tat_flash', type: 'radio', label: 'Czy publikujesz wolne wzory (flash) do wzięcia?', showIf: { ind: ['tatuaz'] },
      options: O('tak|Tak — chcę sekcję z wolnymi wzorami edytowaną w panelu', 'ig|Tak, ale tylko na Instagramie', 'nie|Nie') },
    { id: 'tat_piercing', type: 'checkbox', label: 'Piercing — oferta', other: true, showIf: { ind: ['piercing'] },
      options: O('ucho|Ucho', 'nos|Nos', 'usta|Usta / język', 'pepek|Pępek', 'bizuteria|Sprzedaż biżuterii (tytan, złoto)', 'wymiana|Wymiana biżuterii', 'dzieci|Przekłuwanie uszu dzieciom') },
    { id: 'tat_pmu', type: 'checkbox', label: 'Makijaż permanentny — zabiegi', other: true, showIf: { ind: ['pmu'] },
      options: O('brwi|Brwi (pudrowe, włoskowe)', 'usta|Usta', 'kreska|Kreska / zagęszczenie linii rzęs', 'korekta|Korekta / dopigmentowanie', 'usuwanie|Usuwanie (remover / laser)', 'szkolenia|Szkolenia') },

    /* ----- Zdrowie ----- */
    { id: 'zdr_specialists', type: 'textarea', label: 'Specjaliści i ich kwalifikacje', hint: 'Imię i nazwisko, tytuł, specjalizacja, języki, w których przyjmują. Opcjonalnie numer prawa wykonywania zawodu.', showIf: { p: ['zdrowie'] }, max: 3000 },
    { id: 'zdr_form', type: 'radio', label: 'Forma przyjęć', showIf: { p: ['zdrowie'], notind: ['optyk'] },
      options: O('prywatnie|Prywatnie', 'nfz_prywatnie|NFZ i prywatnie', 'nfz|Tylko NFZ', 'abonament|Także w ramach abonamentów / pakietów medycznych') },
    { id: 'zdr_online', type: 'radio', label: 'Czy prowadzisz konsultacje online?', showIf: { p: ['zdrowie'], notind: ['optyk', 'podolog', 'stomatolog'] },
      options: O('tak|Tak', 'nie|Nie', 'planuje|Planuję') },
    { id: 'zdr_patients', type: 'checkbox', label: 'Dla kogo?', other: true, showIf: { p: ['zdrowie'] },
      options: O('dorosli|Dorośli', 'dzieci|Dzieci', 'mlodziez|Młodzież', 'seniorzy|Seniorzy', 'ciaza|Kobiety w ciąży', 'sportowcy|Sportowcy', 'firmy|Firmy (pakiety dla pracowników)', 'cudzoziemcy|Pacjenci obcojęzyczni') },
    { id: 'zdr_info', type: 'checkbox', label: 'Informacje dla pacjentów', other: true, showIf: { p: ['zdrowie'] },
      options: O('pierwsza|Jak wygląda pierwsza wizyta', 'przygotowanie|Jak się przygotować', 'dokumenty|Co zabrać (skierowanie, wyniki badań)', 'odwolanie|Zasady odwoływania wizyt', 'platnosci|Płatności / raty', 'dojazd|Dojazd i parking', 'dostepnosc|Dostępność gabinetu dla osób z niepełnosprawnościami', 'domowe|Wizyty domowe') },
    { id: 'zdr_equipment', type: 'textarea', label: 'Metody, sprzęt i certyfikaty, które chcesz pokazać', showIf: { p: ['zdrowie'] }, max: 2000 },
    { id: 'zdr_dental', type: 'checkbox', label: 'Zakres leczenia stomatologicznego', other: true, showIf: { ind: ['stomatolog'] },
      options: O('zachowawcza|Stomatologia zachowawcza', 'endodoncja|Leczenie kanałowe', 'implanty|Implanty', 'ortodoncja|Ortodoncja / nakładki', 'protetyka|Protetyka', 'estetyczna|Stomatologia estetyczna / wybielanie', 'chirurgia|Chirurgia', 'dzieci|Stomatologia dziecięca', 'periodontologia|Periodontologia / higienizacja', 'rtg|RTG / tomografia na miejscu', 'sedacja|Leczenie w sedacji') },
    { id: 'zdr_physio', type: 'checkbox', label: 'Zakres terapii', other: true, showIf: { ind: ['fizjoterapia'] },
      options: O('manualna|Terapia manualna', 'pourazowa|Rehabilitacja pourazowa / pooperacyjna', 'sportowa|Fizjoterapia sportowa', 'uroginekologiczna|Fizjoterapia uroginekologiczna', 'pediatryczna|Fizjoterapia dziecięca', 'masaz|Masaż leczniczy', 'fizykoterapia|Fizykoterapia (laser, fala uderzeniowa)', 'kinesiotaping|Kinesiotaping', 'domowe|Wizyty domowe') },
    { id: 'zdr_psych', type: 'checkbox', label: 'Formy pomocy', other: true, showIf: { ind: ['psycholog'] },
      options: O('indywidualna|Terapia indywidualna', 'par|Terapia par', 'rodzinna|Terapia rodzinna', 'dzieci|Dzieci i młodzież', 'grupowa|Grupy wsparcia / warsztaty', 'konsultacje|Konsultacje jednorazowe', 'diagnoza|Diagnoza psychologiczna', 'online|Spotkania online') },
    { id: 'zdr_psych_approach', type: 'text', label: 'Nurt / podejście terapeutyczne', placeholder: 'np. poznawczo-behawioralny, psychodynamiczny, systemowy', showIf: { ind: ['psycholog'] }, max: 300 },
    { id: 'zdr_diet', type: 'checkbox', label: 'Oferta dietetyczna', other: true, showIf: { ind: ['dietetyk'] },
      options: O('konsultacje|Konsultacje', 'jadlospisy|Jadłospisy', 'pakiety|Pakiety współpracy', 'online|Współpraca online', 'sklad|Analiza składu ciała', 'sport|Dietetyka sportowa', 'dzieci|Dietetyka dziecięca') },
    { id: 'zdr_speech', type: 'checkbox', label: 'Zakres terapii', other: true, showIf: { ind: ['logopeda'] },
      options: O('wymowa|Wady wymowy', 'opoznienie|Opóźniony rozwój mowy', 'jakanie|Jąkanie', 'si|Integracja sensoryczna', 'neurologopedia|Neurologopedia', 'dorosli|Terapia dorosłych', 'diagnoza|Diagnoza') },
    { id: 'zdr_optic', type: 'checkbox', label: 'Oferta optyka', other: true, showIf: { ind: ['optyk'] },
      options: O('badanie|Badanie wzroku', 'okulary|Okulary korekcyjne', 'soczewki|Soczewki kontaktowe', 'przeciwsloneczne|Okulary przeciwsłoneczne', 'marki|Marki opraw', 'naprawy|Naprawy okularów', 'dzieci|Okulary dla dzieci') },
    { id: 'zdr_podo', type: 'checkbox', label: 'Zabiegi podologiczne', other: true, showIf: { ind: ['podolog'] },
      options: O('wrastajace|Wrastające paznokcie', 'grzybica|Zmiany grzybicze', 'odciski|Odciski / modzele', 'stopa_cukrzycowa|Stopa cukrzycowa', 'klamry|Klamry ortonyksyjne', 'wkladki|Wkładki ortopedyczne') },

    /* ----- Sport ----- */
    { id: 'spo_classes', type: 'textarea', label: 'Rodzaje zajęć / treningów', hint: 'np. trening personalny, zajęcia grupowe, joga dla początkujących, BJJ dla dzieci.', showIf: { p: ['sport'] }, max: 2000 },
    { id: 'spo_schedule', type: 'radio', label: 'Grafik zajęć', other: true, showIf: { p: ['sport'] },
      options: O('panel|Grafik na stronie, edytowany w panelu', 'system|Z systemu zapisów (np. eFitness, Fitssey, WodGuru) — osadzony lub link', 'pdf|Grafik w PDF / jako obrazek', 'brak|Zajęcia indywidualne — bez grafiku') },
    { id: 'spo_passes', type: 'checkbox', label: 'Karnety i płatności', other: true, showIf: { p: ['sport'] },
      options: O('karnety|Karnety miesięczne', 'wejscia|Wejścia jednorazowe', 'karty|Karty sportowe (Multisport, Medicover Sport, FitProfit)', 'proba|Zajęcia próbne', 'znizki|Zniżki (studenckie, rodzinne)', 'online|Płatności online', 'firmy|Oferta dla firm') },
    { id: 'spo_levels', type: 'checkbox', label: 'Dla kogo są zajęcia?', other: true, showIf: { p: ['sport'] },
      options: O('poczatkujacy|Początkujący', 'zaawansowani|Zaawansowani', 'dzieci|Dzieci', 'mlodziez|Młodzież', 'kobiety|Kobiety', 'seniorzy|Seniorzy', 'zawodnicy|Zawodnicy') },
    { id: 'spo_trainers', legacy: true, type: 'radio', label: 'Trenerzy / instruktorzy na stronie', showIf: { p: ['sport'] },
      options: O('profile|Profile z opisem i specjalizacją', 'lista|Krótka lista', 'nie|Nie pokazujemy') },
    { id: 'spo_extras', type: 'checkbox', label: 'Dodatkowo', other: true, showIf: { p: ['sport'] },
      options: O('obozy|Obozy / wyjazdy', 'zawody|Zawody i wyniki', 'sauna|Sauna / strefa relaksu', 'sklep|Sklep / suplementy', 'parking|Parking', 'szatnie|Szatnie i prysznice', 'online|Treningi online', 'plany|Plany treningowe / dietetyczne', 'wynajem|Wynajem sali / kortu') },
    { id: 'spo_trainer_mode', type: 'checkbox', label: 'Gdzie prowadzisz treningi?', other: true, showIf: { ind: ['trener'] },
      options: O('silownia|Na siłowni (podam jakiej)', 'dojazd|Z dojazdem do klienta', 'plener|W plenerze', 'online|Online', 'studio|We własnym studiu') },

    /* ----- Edukacja ----- */
    { id: 'edu_offer', type: 'textarea', label: 'Kursy / przedmioty / programy', hint: 'np. angielski ogólny i biznesowy A1–C1, matematyka do matury, kurs kategorii B.', showIf: { p: ['edukacja'], notind: ['przedszkole'] }, max: 2000 },
    { id: 'edu_mode', type: 'checkbox', label: 'Forma zajęć', other: true, showIf: { p: ['edukacja'], notind: ['przedszkole'] },
      options: O('stacjonarnie|Stacjonarnie', 'online|Online', 'dojazd|Z dojazdem do ucznia / firmy', 'grupowe|Grupowe', 'indywidualne|Indywidualne', 'intensywne|Kursy intensywne / wakacyjne') },
    { id: 'edu_levels', type: 'checkbox', label: 'Dla kogo?', other: true, showIf: { p: ['edukacja'], notind: ['przedszkole', 'szkola_jazdy'] },
      options: O('przedszkolaki|Przedszkolaki', 'podstawowa|Szkoła podstawowa', 'egzamin|Egzamin ósmoklasisty', 'srednia|Szkoła średnia / matura', 'studenci|Studenci', 'dorosli|Dorośli', 'firmy|Firmy', 'seniorzy|Seniorzy') },
    { id: 'edu_enroll', type: 'radio', label: 'Jak wyglądają zapisy?', other: true, showIf: { p: ['edukacja'] },
      options: O('ciagle|Przez cały rok', 'semestr|Na semestr / rok szkolny', 'terminy|Kursy w konkretnych terminach — chcę kalendarz', 'rekrutacja|Rekrutacja z terminami i dokumentami') },
    { id: 'edu_trust', type: 'checkbox', label: 'Co buduje zaufanie do Twojej oferty?', other: true, showIf: { p: ['edukacja'] },
      options: O('kadra|Kwalifikacje kadry', 'metoda|Metoda nauczania', 'wyniki|Wyniki egzaminów (tylko prawdziwe dane)', 'certyfikaty|Certyfikaty / akredytacje', 'proba|Lekcja próbna', 'test|Test poziomujący', 'male_grupy|Małe grupy') },
    { id: 'edu_kids_photos', type: 'info', showIf: { ind: ['przedszkole', 'zajecia_dzieci', 'muzyka', 'animatorzy', 'sala_zabaw'] }, text: 'Zdjęcia, na których widać dzieci, publikujemy wyłącznie za zgodą rodziców. Jeśli takich zgód nie masz, zaplanujemy zdjęcia bez wizerunku dzieci (sale, zajęcia, prace).' },
    { id: 'edu_preschool', type: 'checkbox', label: 'Przedszkole / żłobek — informacje dla rodziców', other: true, showIf: { ind: ['przedszkole'] },
      options: O('plan|Plan dnia', 'jadlospis|Jadłospis / catering', 'zajecia|Zajęcia dodatkowe', 'adaptacja|Adaptacja', 'oplaty|Opłaty i dofinansowania', 'rekrutacja|Rekrutacja i dokumenty', 'kadra|Kadra', 'aktualnosci|Aktualności dla rodziców', 'grupy|Grupy wiekowe') },
    { id: 'edu_driving', type: 'checkbox', label: 'Kategorie i kursy', other: true, showIf: { ind: ['szkola_jazdy'] },
      options: O('am|AM', 'a1_a2|A1 / A2', 'a|A', 'b|B', 'b_automat|B — automatyczna skrzynia', 'be|B+E', 'c|C / C+E', 'd|D', 'doszkalajace|Jazdy doszkalające', 'kwalifikacja|Kwalifikacja wstępna / szkolenia okresowe') },
    { id: 'edu_driving_extras', type: 'checkbox', label: 'Szkoła jazdy — dodatkowo', other: true, showIf: { ind: ['szkola_jazdy'] },
      options: O('raty|Płatność w ratach', 'plac|Własny plac manewrowy', 'teoria_online|Teoria online', 'odbior|Odbiór kursanta', 'auta|Samochody (modele) do pokazania', 'pkk|Pomoc w uzyskaniu PKK') },

    /* ----- Motoryzacja ----- */
    { id: 'aut_services', type: 'checkbox', label: 'Zakres usług', other: true, showIf: { p: ['auto'], notind: ['komis', 'wypozyczalnia_aut'] },
      options: O('mechanika|Mechanika', 'diagnostyka|Diagnostyka komputerowa', 'klimatyzacja|Klimatyzacja', 'opony|Wymiana opon / przechowalnia', 'elektryka|Elektryka / elektronika', 'blacharstwo|Blacharstwo', 'lakiernictwo|Lakiernictwo', 'detailing|Detailing / powłoki', 'lpg|Instalacje LPG', 'geometria|Geometria kół', 'przeglady|Przeglądy rejestracyjne', 'szyby|Szyby', 'hybrydy|Hybrydy / auta elektryczne') },
    { id: 'aut_brands', type: 'text', label: 'Specjalizacja: marki / typy pojazdów', placeholder: 'np. auta osobowe i dostawcze, grupa VAG, motocykle', showIf: { p: ['auto'] }, max: 300 },
    { id: 'aut_form', type: 'checkbox', label: 'Co klient ma podać w zapytaniu?', other: true, showIf: { p: ['auto'], notind: ['komis'] },
      options: O('marka|Marka i model', 'rok|Rok produkcji / silnik', 'rejestracja|Numer rejestracyjny', 'vin|VIN', 'opis|Opis usterki / usługi', 'termin|Preferowany termin', 'zdjecia|Zdjęcia|Przesyłanie plików wymaga dodatkowej konfiguracji.') },
    { id: 'aut_extras', type: 'checkbox', label: 'Udogodnienia', other: true, showIf: { p: ['auto'] },
      options: O('zastepcze|Auto zastępcze', 'odbior|Odbiór i dostarczenie auta', 'szkody|Bezgotówkowa likwidacja szkód z OC / AC', 'floty|Obsługa flot firmowych', 'gwarancja|Gwarancja na usługi', 'poczekalnia|Poczekalnia', 'karta|Płatność kartą', 'faktury|Faktury VAT') },
    { id: 'aut_cars', type: 'radio', label: 'Jak pokazać samochody na sprzedaż?', other: true, showIf: { ind: ['komis'] },
      options: O('otomoto|Odnośnik do ogłoszeń w Otomoto / OLX', 'panel|Lista aut na stronie, edytowana w panelu', 'oba|Wybrane auta na stronie + odnośnik do pełnej oferty') },
    { id: 'aut_dealer', type: 'checkbox', label: 'Komis — usługi', other: true, showIf: { ind: ['komis'] },
      options: O('finansowanie|Kredyt / leasing', 'zamiana|Zamiana auta', 'skup|Skup aut', 'sprowadzanie|Sprowadzanie na zamówienie', 'gwarancja|Gwarancja', 'raport|Historia pojazdu / raport') },
    { id: 'aut_fleet', type: 'textarea', label: 'Flota i warunki wynajmu', hint: 'Modele / klasy aut, kaucja, limit km, minimalny wiek kierowcy, wynajem długoterminowy, podstawienie auta.', showIf: { ind: ['wypozyczalnia_aut'] }, max: 2000 },
    { id: 'aut_roadside', type: 'radio', label: 'Dostępność pomocy drogowej', showIf: { ind: ['pomoc_drogowa'] },
      options: O('calodobowo|Całodobowo, 7 dni w tygodniu', 'godziny|W określonych godzinach', 'umowione|Tylko transport umówiony') },
    { id: 'aut_area', legacy: true, type: 'text', label: 'Obszar działania', placeholder: 'np. Wrocław + 50 km, cała Polska, transport z zagranicy', showIf: { ind: ['pomoc_drogowa', 'wypozyczalnia_aut', 'myjnia'] }, max: 300 },

    /* ----- Budownictwo i dom ----- */
    { id: 'bud_services', type: 'textarea', label: 'Zakres usług / specjalizacje', hint: 'np. stany surowe, wykończenia pod klucz, łazienki, instalacje elektryczne w domach jednorodzinnych.', showIf: { p: ['budowa'] }, max: 2500 },
    { id: 'bud_area', legacy: true, type: 'text', label: 'Obszar działania', placeholder: 'np. Wrocław i powiat wrocławski, Dolny Śląsk', showIf: { p: ['budowa', 'uslugi'] }, max: 300 },
    { id: 'bud_clients', type: 'checkbox', label: 'Dla kogo pracujesz?', other: true, showIf: { p: ['budowa'] },
      options: O('mieszkania|Właściciele mieszkań', 'domy|Właściciele domów', 'firmy|Firmy / lokale usługowe', 'deweloperzy|Deweloperzy', 'wspolnoty|Wspólnoty i spółdzielnie', 'instytucje|Instytucje (przetargi)') },
    { id: 'bud_quote', type: 'radio', label: 'Jak przygotowujesz wycenę?', other: true, showIf: { p: ['budowa'] },
      options: O('pomiar_bezplatny|Bezpłatne oględziny / pomiar', 'pomiar_platny|Płatne oględziny (odliczane od zlecenia)', 'zdjecia|Wstępna wycena na podstawie zdjęć i opisu', 'kalkulator|Chcę kalkulator orientacyjnej ceny na stronie|Osobna funkcja — ustalimy zakres.') },
    { id: 'bud_portfolio', type: 'radio', label: 'Jak pokazać realizacje?', showIf: { p: ['budowa'] },
      options: O('przed_po|Zdjęcia „przed i po”', 'projekty|Opisy projektów: zakres, czas, zdjęcia', 'galeria|Jedna galeria zdjęć', 'brak|Nie mam zdjęć — zrobię przy kolejnych zleceniach') },
    { id: 'bud_trust', type: 'checkbox', label: 'Co pokazać, aby budować zaufanie?', other: true, showIf: { p: ['budowa'] },
      options: O('uprawnienia|Uprawnienia (np. SEP, budowlane, F-gazy)', 'oc|Ubezpieczenie OC', 'gwarancja|Gwarancja na prace', 'umowa|Umowa i harmonogram prac', 'faktura|Faktura VAT', 'materialy|Marki materiałów / autoryzacje producentów', 'dotacje|Pomoc przy dofinansowaniach|Nazwy programów często się zmieniają — podamy aktualne.', 'raty|Raty / finansowanie') },
    { id: 'bud_emergency', type: 'radio', label: 'Czy przyjmujesz zlecenia awaryjne?', showIf: { ind: ['elektryk', 'hydraulik', 'dekarz', 'klimatyzacja'] },
      options: O('calodobowo|Tak, całodobowo', 'godziny|Tak, w godzinach pracy', 'nie|Nie') },
    { id: 'bud_architect', type: 'checkbox', label: 'Zakres usług projektowych', other: true, showIf: { ind: ['architekt'] },
      options: O('koncepcja|Projekt koncepcyjny', 'wykonawczy|Projekt wykonawczy', 'wizualizacje|Wizualizacje 3D', 'nadzor|Nadzór autorski', 'pod_klucz|Wykończenie pod klucz', 'online|Konsultacje / projekt online', 'budowlany|Projekt budowlany / pozwolenia') },
    { id: 'bud_architect_price', legacy: true, type: 'radio', label: 'Jak wyceniasz projekty?', other: true, showIf: { ind: ['architekt'] },
      options: O('m2|Stawka za m²', 'pakiety|Pakiety (np. podstawowy, pełny)', 'indywidualnie|Indywidualnie') },
    { id: 'bud_energy', type: 'checkbox', label: 'Oferta OZE / instalacji', other: true, showIf: { ind: ['fotowoltaika', 'klimatyzacja'] },
      options: O('pv|Fotowoltaika', 'pompy|Pompy ciepła', 'magazyny|Magazyny energii', 'klima|Klimatyzacja', 'rekuperacja|Rekuperacja', 'ladowarki|Ładowarki do aut elektrycznych', 'serwis|Serwis i przeglądy') },
    { id: 'bud_carpentry', type: 'checkbox', label: 'Co wykonujesz?', other: true, showIf: { ind: ['stolarz', 'okna_drzwi'] },
      options: O('kuchnie|Kuchnie', 'szafy|Szafy i zabudowy', 'lazienki|Meble łazienkowe', 'firmy|Meble do lokali / biur', 'schody|Schody', 'okna|Okna', 'drzwi|Drzwi', 'rolety|Rolety / żaluzje / moskitiery', 'bramy|Bramy i automatyka', 'montaz|Montaż i serwis') },
    { id: 'bud_garden', type: 'checkbox', label: 'Usługi ogrodowe', other: true, showIf: { ind: ['ogrody'] },
      options: O('projekt|Projektowanie ogrodów', 'zakladanie|Zakładanie ogrodów i trawników', 'pielegnacja|Pielęgnacja / abonament', 'nawadnianie|Systemy nawadniania', 'bruk|Brukarstwo / tarasy', 'drzewa|Wycinka i pielęgnacja drzew', 'ogrodzenia|Ogrodzenia') },

    /* ----- Usługi dla domu i firm ----- */
    { id: 'usl_services', type: 'textarea', label: 'Zakres usług', hint: 'np. sprzątanie mieszkań, biur, po remoncie, mycie okien; przeprowadzki lokalne i międzymiastowe.', showIf: { p: ['uslugi'] }, max: 2000 },
    { id: 'usl_pricing', legacy: true, type: 'radio', label: 'Jak wyceniasz usługi?', other: true, showIf: { p: ['uslugi'] },
      options: O('cennik|Stały cennik (np. za m², za godzinę, za sztukę)', 'pakiety|Pakiety', 'wycena|Wycena po oględzinach / zdjęciach', 'kalkulator|Chcę kalkulator ceny na stronie|Osobna funkcja — ustalimy zakres.') },
    { id: 'usl_clients', type: 'checkbox', label: 'Dla kogo pracujesz?', other: true, showIf: { p: ['uslugi'] },
      options: O('prywatni|Klienci prywatni', 'firmy|Firmy / biura', 'wspolnoty|Wspólnoty mieszkaniowe', 'najem|Właściciele mieszkań na wynajem', 'instytucje|Instytucje') },
    { id: 'usl_regular', type: 'radio', label: 'Czy oferujesz stałą współpracę (abonament, cykliczne zlecenia)?', showIf: { p: ['uslugi'] },
      options: O('tak|Tak', 'nie|Nie', 'firmy|Tylko dla firm') },
    { id: 'usl_trust', type: 'checkbox', label: 'Co pokazać, aby budować zaufanie?', other: true, showIf: { p: ['uslugi'] },
      options: O('oc|Ubezpieczenie OC', 'umowa|Umowa', 'faktura|Faktura VAT', 'eko|Ekologiczne środki', 'sprzet|Profesjonalny sprzęt', 'weekendy|Praca w weekendy', 'gwarancja|Gwarancja / reklamacje', 'zezwolenia|Zezwolenia / certyfikaty (np. DDD)') },
    { id: 'usl_emergency', type: 'radio', label: 'Czy przyjmujesz zlecenia pilne / awaryjne?', showIf: { ind: ['slusarz', 'ddd', 'serwis_elektroniki', 'zlota_raczka'] },
      options: O('calodobowo|Tak, całodobowo', 'godziny|Tak, w godzinach pracy', 'nie|Nie') },
    { id: 'usl_repair', type: 'checkbox', label: 'Co naprawiasz?', other: true, showIf: { ind: ['serwis_elektroniki', 'krawiec'] },
      options: O('telefony|Telefony / tablety', 'komputery|Komputery / laptopy', 'agd|AGD', 'rtv|RTV', 'odziez|Odzież — przeróbki i naprawy', 'obuwie|Obuwie', 'dojazd|Naprawy z dojazdem', 'wysylka|Naprawy wysyłkowe') },

    /* ----- Usługi profesjonalne ----- */
    { id: 'pro_services', type: 'textarea', label: 'Zakres usług', hint: 'Najważniejsze usługi i to, czym zajmujesz się najczęściej.', showIf: { p: ['biuro'] }, max: 2500 },
    { id: 'pro_clients', type: 'checkbox', label: 'Kim są Twoi klienci?', other: true, showIf: { p: ['biuro'] },
      options: O('prywatni|Osoby prywatne', 'jdg|Jednoosobowe działalności', 'male|Małe firmy', 'srednie|Średnie i duże firmy', 'startupy|Startupy', 'ngo|Organizacje pozarządowe', 'zagraniczni|Klienci zagraniczni') },
    { id: 'pro_industries', type: 'text', label: 'Branże, w których masz największe doświadczenie', showIf: { p: ['biuro'] }, max: 300 },
    { id: 'pro_meeting', type: 'checkbox', label: 'Forma spotkań', showIf: { p: ['biuro'] },
      options: O('biuro|W biurze', 'online|Online', 'dojazd|Z dojazdem do klienta') },
    { id: 'pro_first', type: 'radio', label: 'Jak wygląda pierwszy kontakt?', other: true, showIf: { p: ['biuro'] },
      options: O('bezplatna|Krótka bezpłatna rozmowa', 'platna|Płatna konsultacja', 'formularz|Formularz zapytania / wyceny', 'telefon|Telefon') },
    { id: 'pro_trust', type: 'checkbox', label: 'Co pokazać, aby budować zaufanie?', other: true, showIf: { p: ['biuro'] },
      options: O('uprawnienia|Uprawnienia / wpisy na listy / licencje', 'oc|Ubezpieczenie OC', 'doswiadczenie|Doświadczenie (lata, liczba spraw — tylko prawdziwe dane)', 'publikacje|Publikacje / wystąpienia', 'czlonkostwa|Członkostwa i partnerstwa', 'poufnosc|Poufność i bezpieczeństwo danych', 'certyfikaty|Certyfikaty') },
    { id: 'pro_blog', type: 'radio', label: 'Czy chcesz publikować poradniki / artykuły?', showIf: { p: ['biuro'] },
      options: O('regularnie|Tak, regularnie', 'czasem|Czasami', 'nie|Nie') },
    { id: 'pro_law', type: 'checkbox', label: 'Specjalizacje kancelarii', other: true, showIf: { ind: ['prawnik'] },
      options: O('cywilne|Prawo cywilne', 'rodzinne|Prawo rodzinne', 'karne|Prawo karne', 'gospodarcze|Prawo gospodarcze', 'pracy|Prawo pracy', 'nieruchomosci|Nieruchomości', 'spadkowe|Prawo spadkowe', 'administracyjne|Prawo administracyjne', 'windykacja|Windykacja', 'rodo|Ochrona danych (RODO)', 'cudzoziemcy|Prawo cudzoziemców') },
    { id: 'pro_accounting', type: 'checkbox', label: 'Usługi księgowe', other: true, showIf: { ind: ['ksiegowosc'] },
      options: O('kpir|Księga przychodów i rozchodów', 'ryczalt|Ryczałt', 'pelna|Pełna księgowość', 'kadry|Kadry i płace', 'zus|Rozliczenia ZUS', 'vat|VAT / JPK / e-faktury (KSeF)', 'zakladanie|Zakładanie działalności / spółek', 'doradztwo|Doradztwo podatkowe', 'online|Obsługa w pełni online') },
    { id: 'pro_realestate', type: 'checkbox', label: 'Biuro nieruchomości — usługi', other: true, showIf: { ind: ['nieruchomosci'] },
      options: O('sprzedaz|Sprzedaż', 'wynajem|Wynajem', 'zarzadzanie|Zarządzanie najmem', 'kredyty|Pomoc kredytowa', 'staging|Home staging / sesje zdjęciowe', 'wycena|Wycena nieruchomości', 'komercyjne|Nieruchomości komercyjne') },
    { id: 'pro_listings', type: 'radio', label: 'Jak pokazać oferty nieruchomości?', other: true, showIf: { ind: ['nieruchomosci'] },
      options: O('portal|Odnośnik do ofert na portalu (np. Otodom)', 'panel|Wybrane oferty edytowane w panelu', 'crm|Automatycznie z mojego systemu (CRM)|Wymaga sprawdzenia możliwości eksportu — osobne ustalenie.') },
    { id: 'pro_translations', type: 'text', label: 'Języki i rodzaje tłumaczeń', placeholder: 'np. angielski i niemiecki; przysięgłe, techniczne, ustne', showIf: { ind: ['tlumacz'] }, max: 300 },

    /* ----- Branża kreatywna ----- */
    { id: 'kre_types', type: 'checkbox', label: 'Rodzaje zleceń', other: true, showIf: { ind: ['fotograf', 'filmowiec'] },
      options: O('sluby|Śluby', 'rodzinne|Rodzinne / noworodkowe / ciążowe', 'portrety|Portretowe / wizerunkowe', 'biznes|Biznesowe / dla firm', 'produkty|Produktowe', 'eventy|Eventy i koncerty', 'nieruchomosci|Nieruchomości / wnętrza', 'reklama|Reklama / social media', 'dron|Ujęcia z drona', 'teledyski|Teledyski') },
    { id: 'kre_portfolio', type: 'radio', label: 'Jak pokazać portfolio?', other: true, showIf: { p: ['kreatywne'] },
      options: O('kategorie|Galerie według kategorii', 'projekty|Każdy projekt jako krótka historia (opis + zdjęcia)', 'wideo|Showreel / filmy z YouTube lub Vimeo', 'instagram|Wybrane prace + odnośnik do Instagrama / Behance') },
    { id: 'kre_pricing', legacy: true, type: 'radio', label: 'Jak pokazać ceny?', other: true, showIf: { p: ['kreatywne'] },
      options: O('pakiety|Pakiety z cenami', 'od|Ceny „od…”', 'indywidualnie|Wycena indywidualna') },
    { id: 'kre_client_area', type: 'radio', label: 'Galerie dla klientów do pobierania zdjęć / plików', showIf: { ind: ['fotograf', 'filmowiec'] },
      options: O('zewnetrzna|Używam zewnętrznej usługi — wystarczy odnośnik', 'strona|Chcę na stronie|Osobna funkcja — ustalimy zakres i koszty przechowywania.', 'nie|Nie potrzebuję') },
    { id: 'kre_dates', type: 'radio', label: 'Wolne terminy', showIf: { p: ['kreatywne', 'eventy'] },
      options: O('kalendarz|Kalendarz dostępności edytowany w panelu', 'zapytaj|Informacja „zapytaj o termin”', 'nie|Nie pokazujemy') },
    { id: 'kre_style', type: 'text', label: 'Twój styl w trzech słowach', placeholder: 'np. naturalny, reporterski, ciepły', showIf: { p: ['kreatywne'] }, max: 200 },
    { id: 'kre_dj', type: 'checkbox', label: 'Oferta muzyczna', other: true, showIf: { ind: ['dj_muzyk'] },
      options: O('wesela|Wesela', 'firmowe|Imprezy firmowe', 'urodziny|Urodziny / osiemnastki', 'kluby|Kluby', 'slub|Oprawa ceremonii ślubnej', 'naglosnienie|Nagłośnienie i oświetlenie', 'wodzirej|Wodzirej / animacje', 'ciezki_dym|Efekty (ciężki dym, iskry)') },
    { id: 'kre_media', type: 'radio', label: 'Próbki muzyki / nagrania', showIf: { ind: ['dj_muzyk', 'studio_nagran'] },
      options: O('youtube|Filmy z YouTube', 'audio|Nagrania audio (np. SoundCloud, Spotify)', 'brak|Na razie brak') },
    { id: 'kre_print', type: 'checkbox', label: 'Oferta drukarni / reklamy', other: true, showIf: { ind: ['drukarnia'] },
      options: O('wizytowki|Wizytówki, ulotki, plakaty', 'wielkoformatowy|Druk wielkoformatowy', 'oklejanie|Oklejanie aut / witryn', 'szyldy|Szyldy i kasetony', 'gadzety|Gadżety reklamowe', 'projekt|Projekt graficzny', 'montaz|Montaż') },
    { id: 'kre_print_files', type: 'radio', label: 'Jak klienci przesyłają pliki do druku?', showIf: { ind: ['drukarnia'] },
      options: O('email|E-mailem', 'link|Linkiem (np. WeTransfer, Dysk Google)', 'strona|Przez formularz na stronie|Przesyłanie plików wymaga dodatkowej konfiguracji.') },

    /* ----- Wydarzenia i rozrywka ----- */
    { id: 'eve_types', type: 'checkbox', label: 'Rodzaje wydarzeń', other: true, showIf: { p: ['eventy'] },
      options: O('wesela|Wesela', 'komunie|Komunie / chrzciny', 'urodziny_dzieci|Urodziny dzieci', 'osiemnastki|Osiemnastki / urodziny dorosłych', 'firmowe|Imprezy firmowe / integracje', 'konferencje|Konferencje i szkolenia', 'okolicznosciowe|Inne przyjęcia okolicznościowe') },
    { id: 'eve_capacity', type: 'text', label: 'Pojemność / liczba uczestników', placeholder: 'np. sala do 150 osób; escape room 2–6 osób', showIf: { p: ['eventy'] }, max: 300 },
    { id: 'eve_offer', legacy: true, type: 'radio', label: 'Jak pokazać ofertę i ceny?', other: true, showIf: { p: ['eventy'] },
      options: O('pakiety|Pakiety z cenami „od…”', 'menu|Przykładowe menu i ceny za osobę', 'cennik|Cennik (np. za godzinę, za osobę)', 'indywidualnie|Wycena indywidualna') },
    { id: 'eve_extras', type: 'checkbox', label: 'Co jeszcze zapewniasz?', other: true, showIf: { p: ['eventy'] },
      options: O('noclegi|Noclegi dla gości', 'parking|Parking', 'dekoracje|Dekoracje', 'tort|Tort / słodki stół', 'muzyka|Muzyka (DJ / zespół)', 'fotobudka|Fotobudka', 'dzieci|Kącik / opieka dla dzieci', 'catering|Catering', 'transport|Transport gości') },
    { id: 'eve_media', type: 'radio', label: 'Wideo / wirtualny spacer', showIf: { p: ['eventy'] },
      options: O('mam|Mam film / spacer 360°', 'chce|Chcę przygotować', 'nie|Nie potrzebuję') },
    { id: 'eve_fun', type: 'checkbox', label: 'Informacje dla odwiedzających', other: true, showIf: { ind: ['escape_room', 'sala_zabaw', 'rozrywka'] },
      options: O('rezerwacja|Rezerwacja online z płatnością|Osobna funkcja — możliwe przez zewnętrzny system.', 'urodziny|Pakiety urodzinowe', 'firmy|Oferta dla firm / integracje', 'regulamin|Regulamin', 'wiek|Ograniczenia wieku / wzrostu', 'vouchery|Vouchery', 'skarpetki|Wymagania (np. skarpetki antypoślizgowe, strój)', 'opiekun|Zasady pobytu z opiekunem') },
    { id: 'eve_rooms', type: 'textarea', label: 'Pokoje / atrakcje', hint: 'Nazwy pokojów lub atrakcji, poziom trudności, czas gry, liczba osób.', showIf: { ind: ['escape_room', 'rozrywka'] }, max: 2000 },

    /* ----- Handel i produkcja ----- */
    { id: 'han_assortment', type: 'textarea', label: 'Asortyment i kategorie produktów', showIf: { p: ['handel'] }, max: 2500 },
    { id: 'han_show', type: 'radio', label: 'Jak pokazać produkty?', required: true, other: true, showIf: { p: ['handel'] },
      options: O('kategorie|Kategorie i przykładowe produkty — bez sprzedaży online', 'katalog|Katalog produktów edytowany w panelu (bez koszyka)', 'link|Odnośnik do mojego sklepu online / Allegro', 'sklep|Sklep internetowy z koszykiem i płatnościami|Większy projekt — osobne ustalenie zakresu i kosztów.') },
    { id: 'han_count', legacy: true, type: 'radio', label: 'Ile produktów chcesz pokazać?', showIf: { p: ['handel'] },
      options: O('do20|Do 20', 'do100|20–100', 'do500|100–500', 'ponad500|Ponad 500') },
    { id: 'han_platform', type: 'text', label: 'Na jakiej platformie jest Twój sklep?', placeholder: 'np. Shoper, WooCommerce, Shopify, Allegro', showIf: { f: 'han_show', in: ['link', 'sklep'] }, max: 200 },
    { id: 'han_delivery', type: 'checkbox', label: 'Odbiór i dostawa', other: true, showIf: { p: ['handel'] },
      options: O('odbior|Odbiór osobisty', 'rezerwacja|Rezerwacja telefoniczna, odbiór w sklepie', 'lokalna|Dostawa lokalna', 'kurier|Wysyłka kurierem', 'paczkomat|Paczkomaty / punkty odbioru', 'zagranica|Wysyłka za granicę') },
    { id: 'han_firms', type: 'radio', label: 'Czy sprzedajesz firmom (hurt / B2B)?', showIf: { p: ['handel'] },
      options: O('tak|Tak — z osobną informacją dla firm', 'tylko|Głównie firmom', 'nie|Nie') },
    { id: 'han_extras', type: 'checkbox', label: 'Dodatkowo', other: true, showIf: { p: ['handel'] },
      options: O('promocje|Promocje / gazetka', 'nowosci|Nowości', 'karty|Karty podarunkowe', 'lojalnosc|Program lojalnościowy', 'zamowienia|Zamówienia indywidualne', 'serwis|Serwis / naprawy', 'doradztwo|Doradztwo w sklepie', 'marki|Marki, które sprzedajemy') },
    { id: 'han_flowers', type: 'checkbox', label: 'Kwiaciarnia — oferta', other: true, showIf: { ind: ['kwiaciarnia'] },
      options: O('bukiety|Bukiety', 'pogrzebowe|Wiązanki i wieńce pogrzebowe', 'slub|Florystyka ślubna', 'eventy|Dekoracje eventów', 'dostawa|Dostawa kwiatów', 'firmy|Kompozycje i abonamenty dla firm', 'doniczkowe|Rośliny doniczkowe', 'flowerbox|Flowerboxy') },
    { id: 'han_jeweler', type: 'checkbox', label: 'Jubiler — usługi', other: true, showIf: { ind: ['jubiler'] },
      options: O('obraczki|Obrączki i pierścionki zaręczynowe', 'na_zamowienie|Biżuteria na zamówienie', 'naprawy|Naprawy biżuterii', 'grawer|Grawerowanie', 'zegarki|Serwis zegarków', 'skup|Skup złota') },
    { id: 'han_producer', type: 'checkbox', label: 'Producent — co pokazać?', other: true, showIf: { ind: ['producent', 'hurtownia'] },
      options: O('proces|Proces produkcji', 'certyfikaty|Certyfikaty jakości', 'dystrybutorzy|Gdzie kupić / dystrybutorzy', 'hurt|Warunki współpracy hurtowej', 'eksport|Eksport', 'personalizacja|Produkty personalizowane / OEM', 'katalog|Katalog PDF') },
    { id: 'han_ecommerce_info', type: 'info', showIf: { ind: ['sklep_online'] }, text: 'Sklep internetowy to osobny, większy projekt (płatności, regulamin sklepu, wysyłki, zwroty). Ten brief pomoże go wstępnie opisać — zakres i koszty ustalimy oddzielnie.' },

    /* ----- Zwierzęta ----- */
    { id: 'zwi_animals', type: 'checkbox', label: 'Jakie zwierzęta?', other: true, showIf: { p: ['zwierzeta'] },
      options: O('psy|Psy', 'koty|Koty', 'gryzonie|Króliki i gryzonie', 'ptaki|Ptaki', 'egzotyczne|Gady i zwierzęta egzotyczne', 'konie|Konie', 'gospodarskie|Zwierzęta gospodarskie') },
    { id: 'zwi_services', type: 'textarea', label: 'Zakres usług', showIf: { p: ['zwierzeta'] }, max: 2000 },
    { id: 'zwi_info', type: 'checkbox', label: 'Informacje dla właścicieli', other: true, showIf: { p: ['zwierzeta'] },
      options: O('przygotowanie|Jak przygotować zwierzę do wizyty / pobytu', 'szczepienia|Wymagane szczepienia i dokumenty', 'dojazd|Wizyty domowe / dojazd', 'nagle|Nagłe przypadki / dyżury', 'cennik|Cennik', 'galeria|Galeria pupili (za zgodą właścicieli)', 'regulamin|Regulamin') },
    { id: 'zwi_vet', type: 'radio', label: 'Dostępność gabinetu', showIf: { ind: ['weterynarz'] },
      options: O('calodobowo|Całodobowo', 'dyzury|Dyżury w określone dni', 'godziny|W godzinach otwarcia') },
    { id: 'zwi_breeding', type: 'checkbox', label: 'Hodowla — co pokazać?', other: true, showIf: { ind: ['hodowla'] },
      options: O('rasa|Opis rasy', 'zwiazek|Przynależność do związku (np. ZKwP / FCI)', 'rodzice|Psy / koty hodowlane i rodowody', 'mioty|Planowane mioty', 'dostepne|Dostępne zwierzęta', 'absolwenci|Absolwenci hodowli', 'umowa|Warunki rezerwacji i umowa') },
    { id: 'zwi_horses', type: 'checkbox', label: 'Stajnia — oferta', other: true, showIf: { ind: ['stajnia'] },
      options: O('nauka|Nauka jazdy', 'rekreacja|Jazdy rekreacyjne / w teren', 'hipoterapia|Hipoterapia', 'pensjonat|Pensjonat dla koni', 'obozy|Obozy / półkolonie', 'urodziny|Urodziny w stajni') },

    /* ----- Turystyka i transport ----- */
    { id: 'tur_offer', type: 'textarea', label: 'Oferta: kierunki, trasy, atrakcje lub zakres przewozów', showIf: { p: ['turystyka'] }, max: 2500 },
    { id: 'tur_booking', type: 'radio', label: 'Jak klienci rezerwują / zamawiają?', other: true, showIf: { p: ['turystyka'] },
      options: O('formularz|Formularz zapytania', 'telefon|Telefonicznie', 'system|Zewnętrzny system rezerwacji i płatności (podam link)', 'kalendarz|Lista terminów na stronie + zapytanie') },
    { id: 'tur_info', type: 'checkbox', label: 'Informacje do pokazania', other: true, showIf: { p: ['turystyka'] },
      options: O('terminy|Terminy wyjazdów / kursów', 'program|Szczegółowy program', 'cena|Co zawiera cena', 'ubezpieczenie|Ubezpieczenie', 'regulamin|Regulamin / warunki uczestnictwa', 'wymagania|Wymagania (wiek, kondycja, sprzęt)', 'flota|Flota / sprzęt ze zdjęciami', 'jezyki|Obsługa w językach obcych', 'grupy|Oferta dla grup / szkół / firm') },
    { id: 'tur_register_info', type: 'info', showIf: { ind: ['biuro_podrozy'] }, text: 'Organizator turystyki pokazuje na stronie m.in. numer wpisu do rejestru organizatorów turystyki i informacje o zabezpieczeniu finansowym — przygotuj te dane.' },
    { id: 'tur_rental', type: 'textarea', label: 'Sprzęt i warunki wypożyczenia', hint: 'Rodzaje sprzętu, ceny za godzinę / dzień, kaucja, dowóz sprzętu.', showIf: { ind: ['wypozyczalnia'] }, max: 2000 },
    { id: 'tur_transport', type: 'checkbox', label: 'Zakres transportu', other: true, showIf: { ind: ['transport', 'przewoz_osob'] },
      options: O('krajowy|Krajowy', 'miedzynarodowy|Międzynarodowy', 'lotnisko|Transfery lotniskowe', 'grupy|Przewóz grup / wycieczek', 'wesela|Przewozy na wesela i eventy', 'adr|ADR', 'chlodnie|Chłodnie', 'ekspres|Ekspres / dostawy tego samego dnia', 'magazyn|Magazynowanie') },
    { id: 'tur_fleet', type: 'text', label: 'Flota', placeholder: 'np. 3 busy 8+1, autokar 50 miejsc, 2 ciągniki siodłowe', showIf: { ind: ['transport', 'przewoz_osob'] }, max: 300 },

    /* ----- Organizacje i kultura ----- */
    { id: 'ngo_mission', type: 'textarea', label: 'Misja i główne działania', showIf: { p: ['ngo'] }, max: 2500 },
    { id: 'ngo_support', type: 'checkbox', label: 'Jak można Was wspierać?', other: true, showIf: { p: ['ngo'] },
      options: O('przelew|Darowizny przelewem (numer konta)', 'online|Darowizny online|Bramka płatności — osobne ustalenie.', 'podatek|1,5% podatku (numer KRS)', 'wolontariat|Wolontariat', 'sponsorzy|Sponsorzy / partnerzy', 'zbiorki|Zbiórki rzeczowe') },
    { id: 'ngo_docs', type: 'checkbox', label: 'Dokumenty i informacje do publikacji', other: true, showIf: { p: ['ngo'] },
      options: O('statut|Statut', 'sprawozdania|Sprawozdania', 'zarzad|Zarząd / zespół', 'dotacje|Projekty dofinansowane (z oznaczeniem grantodawców)', 'krs|Dane rejestrowe (KRS, NIP)') },
    { id: 'ngo_grants_info', type: 'info', showIf: { p: ['ngo'] }, text: 'Projekty finansowane z dotacji często wymagają określonego oznakowania na stronie (logotypy, formułki). Jeśli takie masz, prześlij wytyczne grantodawcy.' },
    { id: 'ngo_events', type: 'radio', label: 'Wydarzenia / repertuar', showIf: { p: ['ngo'] },
      options: O('panel|Kalendarz wydarzeń edytowany w panelu', 'bilety|Odnośnik do systemu biletowego', 'oba|Kalendarz + bilety', 'nie|Nie potrzebuję') },
  ];

  /* Pola wspólne na końcu kroku branżowego */
  var INDUSTRY_COMMON = [
    { id: 'ind_must_know', type: 'textarea', label: 'Co klient musi wiedzieć, zanim się z Tobą skontaktuje?', hint: 'np. obszar dojazdu, minimalne zamówienie, czas oczekiwania na termin, czego nie robisz.', max: 2000 },
    { id: 'ind_faq', type: 'textarea', label: 'O co klienci najczęściej pytają?', hint: 'Wypisz pytania (i jeśli chcesz — odpowiedzi). Przygotuję z nich sekcję „Najczęstsze pytania”.', max: 3000 },
    { id: 'ind_season', type: 'radio', label: 'Czy Twoja działalność jest sezonowa?', other: true,
      options: O('caly_rok|Działam podobnie przez cały rok', 'lato|Najwięcej pracy latem', 'zima|Najwięcej pracy zimą', 'okresy|Są okresy wzmożonego ruchu (np. święta, sezon ślubny, wrzesień)') },
    { id: 'ind_competition', legacy: true, type: 'textarea', label: 'Od kogo chcesz się odróżnić?', hint: 'Opcjonalnie: firmy lub strony konkurencji i co robisz inaczej.', max: 1500 },
  ];

  /* =========================================================
     UKŁADY STRONY
     ========================================================= */
  var LAYOUTS = [
    { v: 'grid', l: 'Układ siatki (Grid)', h: 'Uporządkowane kolumny i wiersze — dla rozbudowanej oferty.',
      how: 'Treści są rozmieszczone w uporządkowanych kolumnach i wierszach. Produkty, usługi lub artykuły mają podobną formę, dzięki czemu łatwo je przeglądać i porównywać.',
      best: 'Sklepy internetowe, hurtownie, firmy z rozbudowaną ofertą, szkoły i firmy szkoleniowe, portale informacyjne. Szczególnie przydatny, gdy trzeba zaprezentować wiele równorzędnych pozycji.' },
    { v: 'f', l: 'Układ w kształcie litery F', h: 'Nagłówki i tekst wyrównane do lewej — dla stron z dużą ilością treści.',
      how: 'Najważniejsze informacje znajdują się na górze, a kolejne nagłówki i fragmenty treści są wyrównane do lewej. Ułatwia szybkie skanowanie strony zawierającej dużo tekstu.',
      best: 'Kancelarie, biura rachunkowe, firmy doradcze, placówki edukacyjne, blogi i bazy wiedzy. Dobry do szczegółowych opisów usług, poradników i informacji.' },
    { v: 'z', l: 'Układ zygzakowy (Z-pattern)', h: 'Tekst i zdjęcie na przemian — prosty przekaz i wyraźny przycisk.',
      how: 'Elementy prowadzą wzrok od lewego górnego rogu do prawego, następnie po przekątnej w dół i ponownie w prawo. Nazwa lub logo, hasło, zdjęcie i przycisk tworzą prostą kolejność zapoznawania się z ofertą.',
      best: 'Małe firmy usługowe, kampanie reklamowe, pojedyncze usługi, kursy i premiery produktów. Najlepiej działa w prostych sekcjach z krótkim przekazem i wyraźnym przyciskiem działania.' },
    { v: 'onepage', l: 'One Page — jedna przewijana strona', h: 'Wszystko na jednej stronie, menu przewija do sekcji.',
      how: 'Wszystkie najważniejsze informacje znajdują się na jednej stronie: prezentacja firmy, oferta, cennik, realizacje i kontakt. Menu przenosi użytkownika do odpowiedniej sekcji.',
      best: 'Salony beauty i fryzjerskie, gabinety masażu, warsztaty samochodowe, restauracje, freelancerzy i małe firmy lokalne. Dobry wybór przy niewielkiej liczbie usług i zwięzłej treści.' },
    { v: 'immersive', l: 'Układ pełnoekranowy (Immersive)', h: 'Duże zdjęcie lub film na pierwszym ekranie — liczy się klimat.',
      how: 'Pierwszy ekran wypełnia duże zdjęcie, grafika lub film, uzupełnione krótkim hasłem i przyciskiem. Strona mocno eksponuje obraz i atmosferę marki.',
      best: 'Fotografowie, architekci, projektanci wnętrz, hotele, obiekty turystyczne, restauracje i marki premium. Najlepiej sprawdza się przy dobrych materiałach wizualnych.' },
    { v: 'split', l: 'Podział ekranu (Split Screen)', h: 'Połowa ekranu to tekst i przyciski, połowa — zdjęcie.',
      how: 'Ekran jest podzielony na dwie części: jedna przedstawia tekst i przyciski, druga zdjęcie lub grafikę. Można też w ten sposób pokazać dwie główne gałęzie oferty. Na telefonie części układają się jedna pod drugą.',
      best: 'Gabinety, salony beauty, kancelarie, doradcy, trenerzy i firmy usługowe. Dobry, gdy równie ważne są jasny opis oferty i jej wizualna prezentacja.' },
    { v: 'bento', l: 'Układ Bento — kafelki o różnych rozmiarach', h: 'Większe i mniejsze bloki wyróżniają najważniejsze elementy oferty.',
      how: 'Treści tworzą uporządkowaną kompozycję mniejszych i większych bloków. Największe kafelki wyróżniają główną ofertę, a pozostałe pokazują usługi, zdjęcia i dodatkowe informacje.',
      best: 'Firmy technologiczne, agencje marketingowe, studia projektowe, marki kreatywne i firmy oferujące produkty cyfrowe. Sprawdza się, gdy trzeba wyróżnić kilka różnych elementów oferty.' },
    { v: 'auto', l: 'Nie mam preferencji — proszę dobrać układ najlepszy dla mojej branży', h: 'Dobiorę układ do branży, ilości treści i materiałów, a wybór uzasadnię.' },
  ];
  /* Polecane układy: według profilu branży, z wyjątkami dla konkretnych branż. */
  var LAYOUT_BY_PROFILE = {
    gastro: ['onepage', 'immersive'], noclegi: ['immersive', 'grid'], uroda: ['onepage', 'split'], tatuaz: ['immersive', 'grid'],
    zdrowie: ['split', 'f'], sport: ['onepage', 'z'], edukacja: ['grid', 'f'], auto: ['onepage', 'z'], budowa: ['z', 'grid'],
    uslugi: ['z', 'onepage'], biuro: ['f', 'split'], kreatywne: ['immersive', 'bento'], eventy: ['immersive', 'onepage'],
    handel: ['grid', 'split'], zwierzeta: ['onepage', 'split'], turystyka: ['immersive', 'grid'], ngo: ['f', 'grid'],
  };
  var LAYOUT_BY_INDUSTRY = {
    sklep_online: ['grid'], hurtownia: ['grid'], producent: ['grid', 'bento'], it: ['bento', 'z'], marketing: ['bento', 'z'], grafik: ['bento', 'immersive'],
    fotograf: ['immersive', 'grid'], architekt: ['immersive', 'bento'], prawnik: ['f', 'split'], ksiegowosc: ['f', 'split'], doradztwo: ['split', 'f'],
    kursy: ['grid', 'f'], szkola_jezykowa: ['grid', 'f'], trener: ['split', 'z'], komis: ['grid'], nieruchomosci: ['grid', 'split'],
    hotel: ['immersive', 'grid'], restauracja: ['immersive', 'onepage'], drukarnia: ['grid', 'bento'], psycholog: ['split', 'onepage'],
  };

  var BRIEF = {
    version: 6,
    title: 'Brief projektowy strony internetowej',
    steps: [
      /* ---------------------------------------------------- 1 */
      {
        id: 'firma',
        title: 'O firmie',
        intro: 'Kilka podstawowych informacji, żeby strona dobrze oddawała charakter Twojej firmy.',
        fields: [
          { id: 'company_name', type: 'text', label: 'Nazwa firmy (tak, jak ma się pojawić na stronie)', required: true, max: 150 },
          { id: 'contact_name', type: 'text', label: 'Imię i nazwisko osoby do kontaktu', required: true, max: 120 },
          { id: 'contact_email', type: 'email', label: 'E-mail do kontaktu w sprawie projektu', required: true, max: 254 },
          { id: 'contact_phone', type: 'tel', label: 'Telefon', max: 30 },
          { id: 'industry_type', type: 'select', label: 'Branża', required: true, groups: INDUSTRY_GROUPS, placeholder: '— wybierz branżę z listy —', hint: 'Na tej podstawie w następnym kroku pokażę pytania dopasowane do Twojej branży. Jeśli nie ma jej na liście, wybierz „Inna branża” na końcu.' },
          { id: 'industry', type: 'text', label: 'Doprecyzuj branżę / specjalizację', placeholder: 'np. salon fryzjerski dla dzieci, warsztat specjalizujący się w autach japońskich', requiredIf: { ind: ['inna'] }, hint: 'Przy „Inna branża” to pole jest wymagane.', max: 150 },
          { id: 'description', type: 'textarea', label: 'Czym zajmuje się firma?', hint: 'Krótko, własnymi słowami: co robicie, dla kogo, od kiedy działacie.', required: true, max: 3000 },
          { id: 'strengths', type: 'textarea', label: 'Dlaczego klienci wybierają właśnie Ciebie?', hint: 'Co wyróżnia firmę na tle konkurencji: doświadczenie, specjalizacja, lokalizacja, podejście do klienta, marki, z którymi pracujesz. To będzie podstawa sekcji „Dlaczego my”.', max: 2000 },
          {
            id: 'audience', type: 'checkbox', label: 'Kim są Twoi klienci?', other: true, showIf: { notp: ['noclegi', 'zdrowie', 'budowa', 'uslugi', 'biuro', 'sport', 'edukacja'] },
            hint: 'W części branż zapytam o to dokładniej w następnym kroku.',
            options: [
              { v: 'indywidualni', l: 'Klienci indywidualni' },
              { v: 'firmy', l: 'Firmy (B2B)' },
              { v: 'kobiety', l: 'Głównie kobiety' },
              { v: 'mezczyzni', l: 'Głównie mężczyźni' },
              { v: 'rodziny', l: 'Rodziny z dziećmi' },
              { v: 'dzieci_mlodziez', l: 'Dzieci i młodzież' },
              { v: 'studenci', l: 'Studenci' },
              { v: 'seniorzy', l: 'Seniorzy' },
              { v: 'turysci', l: 'Turyści / obcokrajowcy' },
            ],
          },
          {
            id: 'area', type: 'radio', label: 'Na jakim obszarze działasz?', other: true,
            options: [
              { v: 'lokalnie', l: 'Lokalnie — dzielnica / okolica' },
              { v: 'miasto', l: 'Całe miasto' },
              { v: 'region', l: 'Region / województwo' },
              { v: 'polska', l: 'Cała Polska' },
              { v: 'online', l: 'Głównie online' },
            ],
          },
          { id: 'area_details', type: 'text', label: 'Doprecyzuj obszar działania', placeholder: 'np. Wrocław + 30 km, Dolny Śląsk, dojazd do klienta', max: 300 },
          { id: 'location', type: 'text', label: 'Miasto / adres działalności', hint: 'Podaj, jeśli klienci przychodzą do Ciebie na miejscu.', max: 300 },
          {
            id: 'show_address', type: 'radio', label: 'Czy adres ma być widoczny na stronie?', hint: 'Mapę dojazdu wybierzesz w kroku „Sekcje strony”.',
            options: [
              { v: 'tak', l: 'Tak, pełny adres' },
              { v: 'tylko_miasto', l: 'Tylko miasto / obszar działania' },
              { v: 'nie', l: 'Nie' },
            ],
          },
        ],
      },

      /* ---------------------------------------------------- 2 */
      {
        id: 'branza',
        title: 'Pytania branżowe',
        intro: 'Pytania dopasowane do Twojej branży.',
        fields: INDUSTRY_FIELDS.concat(INDUSTRY_COMMON),
      },

      /* ---------------------------------------------------- 3 */
      {
        id: 'cele',
        title: 'Cel strony',
        intro: 'Dobra strona ma jasny cel. Zaznacz, co jest dla Ciebie najważniejsze.',
        fields: [
          {
            id: 'goals', type: 'checkbox', label: 'Do czego ma służyć strona?', required: true, other: true,
            options: [
              { v: 'klienci', l: 'Pozyskiwanie nowych klientów' },
              { v: 'wizerunek', l: 'Profesjonalny wizerunek i wiarygodność' },
              { v: 'oferta', l: 'Prezentacja oferty i cennika' },
              { v: 'rezerwacje', l: 'Przyjmowanie rezerwacji / umawianie wizyt' },
              { v: 'zapytania', l: 'Zbieranie zapytań ofertowych' },
              { v: 'informacje', l: 'Informacje dla obecnych klientów (godziny, zmiany, aktualności)' },
              { v: 'portfolio', l: 'Pokazanie realizacji / efektów pracy' },
              { v: 'rekrutacja', l: 'Rekrutacja pracowników' },
              { v: 'sprzedaz', l: 'Sprzedaż online' },
            ],
          },
          {
            id: 'main_action', type: 'radio', label: 'Co odwiedzający ma przede wszystkim zrobić na stronie?', required: true, other: true,
            options: [
              { v: 'zadzwonic', l: 'Zadzwonić' },
              { v: 'zarezerwowac', l: 'Zarezerwować wizytę online' },
              { v: 'formularz', l: 'Wysłać zapytanie przez formularz' },
              { v: 'email', l: 'Napisać e-mail' },
              { v: 'odwiedzic', l: 'Przyjść / przyjechać na miejsce' },
              { v: 'kupic', l: 'Kupić produkt' },
            ],
          },
          { id: 'success', type: 'textarea', label: 'Po czym poznasz, że strona dobrze działa?', hint: 'np. „klienci przestaną dzwonić z pytaniem o cennik”, „więcej rezerwacji przez Booksy”.', max: 1500 },
        ],
      },

      /* ---------------------------------------------------- 3 */
      {
        id: 'jezyki',
        title: 'Wersje językowe',
        intro: 'Strona w języku polskim jest zawsze. Możesz dodać kolejne wersje.',
        fields: [
          {
            id: 'languages', type: 'checkbox', label: 'W jakich językach ma być strona?', required: true, other: true, default: ['pl'],
            options: [
              { v: 'pl', l: 'Polski' },
              { v: 'en', l: 'Angielski' },
              { v: 'de', l: 'Niemiecki' },
              { v: 'uk', l: 'Ukraiński' },
              { v: 'ru', l: 'Rosyjski' },
              { v: 'cs', l: 'Czeski' },
            ],
          },
          {
            id: 'lang_scope', type: 'radio', label: 'Jak pełne mają być wersje obcojęzyczne?',
            showIf: { f: 'languages', not: ['pl'] },
            options: [
              { v: 'pelne', l: 'Pełne — cała strona przetłumaczona' },
              { v: 'skrocone', l: 'Skrócone — najważniejsze informacje i kontakt' },
              { v: 'nie_wiem', l: 'Nie wiem — proszę o rekomendację' },
            ],
          },
          {
            id: 'translations', type: 'radio', label: 'Kto przygotuje tłumaczenia?',
            showIf: { f: 'languages', not: ['pl'] },
            options: [
              { v: 'firma', l: 'Dostarczę gotowe tłumaczenia' },
              { v: 'wykonawca', l: 'Proszę o przygotowanie (z pomocą narzędzi AI), sprawdzę je przed publikacją' },
              { v: 'tlumacz', l: 'Zlecę profesjonalnemu tłumaczowi' },
            ],
          },
        ],
      },

      /* ---------------------------------------------------- 4 */
      {
        id: 'struktura',
        title: 'Sekcje strony',
        intro: 'Zaznacz wszystko, co chcesz mieć na stronie. Jeśli nie masz pewności — zaznacz i dopisz w uwagach, przedyskutujemy to.',
        fields: [
          {
            id: 'layout', type: 'radio', label: 'Jaki układ strony wybierasz?', required: true, layouts: true, options: LAYOUTS,
            hint: 'Kliknij „i” przy układzie, aby zobaczyć, jak wygląda i dla kogo jest najlepszy. Oznaczenie „Polecane” to układy, które najczęściej sprawdzają się w Twojej branży.',
          },
          {
            id: 'site_type', type: 'radio', label: 'Jedna strona czy kilka podstron?', required: true, showIf: { f: 'layout', neq: 'onepage' },
            options: [
              { v: 'onepage', l: 'Jedna długa strona (one-page)', h: 'Wszystko na jednej stronie, przewijane sekcjami. Dobre dla mniejszych firm.' },
              { v: 'podstrony', l: 'Kilka podstron', h: 'Osobne strony np. dla oferty, cennika, galerii. Dobre przy rozbudowanej ofercie.' },
              { v: 'nie_wiem', l: 'Nie wiem — proszę o rekomendację' },
            ],
          },
          {
            id: 'sections', type: 'checkbox', label: 'Jakie sekcje mają się znaleźć na stronie?', required: true, other: true, recommend: true,
            hint: 'Oznaczenie „Polecane” wskazuje sekcje, które zwykle sprawdzają się w Twojej branży — to tylko podpowiedź.',
            groups: [
              {
                l: 'Typowe dla Twojej branży',
                items: [
                  { v: 'menu', l: 'Menu / karta', p: ['gastro'] },
                  { v: 'zamowienia', l: 'Zamówienia / dostawa', p: ['gastro', 'handel'] },
                  { v: 'pokoje', l: 'Pokoje / apartamenty z opisami i galeriami', p: ['noclegi'] },
                  { v: 'udogodnienia', l: 'Udogodnienia', p: ['noclegi'] },
                  { v: 'okolica', l: 'Okolica i atrakcje w pobliżu', p: ['noclegi', 'turystyka'] },
                  { v: 'flash', l: 'Wolne wzory (flash)', p: ['tatuaz'] },
                  { v: 'pielegnacja', l: 'Pielęgnacja po zabiegu / gojenie', p: ['tatuaz', 'uroda'] },
                  { v: 'grafik', l: 'Grafik zajęć', p: ['sport', 'edukacja'] },
                  { v: 'kursy', l: 'Kursy / programy / poziomy', p: ['edukacja', 'sport'] },
                  { v: 'strefa_rodzica', l: 'Informacje dla rodziców', p: ['edukacja', 'sport'] },
                  { v: 'flota', l: 'Flota / sprzęt', p: ['auto', 'turystyka', 'uslugi'] },
                  { v: 'oferty', l: 'Aktualne oferty (auta / nieruchomości / produkty)', p: ['auto', 'biuro', 'handel'] },
                  { v: 'proces', l: 'Jak pracujemy — etapy współpracy', p: ['budowa', 'uslugi', 'biuro', 'kreatywne'] },
                  { v: 'obszar', l: 'Obszar działania', p: ['budowa', 'uslugi', 'zwierzeta', 'turystyka', 'auto'] },
                  { v: 'kalendarz', l: 'Kalendarz wydarzeń / wolnych terminów', p: ['eventy', 'kreatywne', 'ngo', 'turystyka', 'edukacja'] },
                  { v: 'wsparcie', l: 'Jak nas wesprzeć', p: ['ngo'] },
                  { v: 'sprawozdania', l: 'Sprawozdania i dokumenty', p: ['ngo'] },
                ],
              },
              {
                l: 'Podstawowe',
                items: [
                  { v: 'o_nas', l: 'O nas / o firmie' },
                  { v: 'oferta', l: 'Oferta / usługi' },
                  { v: 'cennik', l: 'Cennik' },
                  { v: 'kontakt', l: 'Kontakt' },
                  { v: 'mapa', l: 'Mapa i dojazd' },
                  { v: 'godziny', l: 'Godziny otwarcia' },
                ],
              },
              {
                l: 'Prezentacja firmy',
                items: [
                  { v: 'zespol', l: 'Zespół / specjaliści' },
                  { v: 'galeria', l: 'Galeria zdjęć' },
                  { v: 'realizacje', l: 'Realizacje / efekty „przed i po”' },
                  { v: 'wideo', l: 'Film / wideo' },
                  { v: 'historia', l: 'Historia firmy' },
                  { v: 'marki', l: 'Marki / produkty, z którymi pracujemy' },
                  { v: 'certyfikaty', l: 'Certyfikaty, dyplomy, uprawnienia' },
                  { v: 'nagrody', l: 'Nagrody i wyróżnienia' },
                  { v: 'partnerzy', l: 'Partnerzy / klienci biznesowi' },
                ],
              },
              {
                l: 'Budowanie zaufania',
                items: [
                  { v: 'opinie', l: 'Opinie klientów', h: 'Tylko prawdziwe opinie, za zgodą autorów lub jako link do Google / Booksy.' },
                  { v: 'faq', l: 'Najczęstsze pytania (FAQ)' },
                  { v: 'gwarancja', l: 'Gwarancja / zasady współpracy' },
                  { v: 'regulamin', l: 'Regulamin (np. odwoływania wizyt)' },
                ],
              },
              {
                l: 'Komunikacja i sprzedaż',
                items: [
                  { v: 'aktualnosci', l: 'Aktualności / blog' },
                  { v: 'promocje', l: 'Promocje i oferty specjalne' },
                  { v: 'vouchery', l: 'Bony / vouchery podarunkowe' },
                  { v: 'pakiety', l: 'Pakiety / karnety' },
                  { v: 'wycena', l: 'Formularz zapytania / wyceny' },
                  { v: 'do_pobrania', l: 'Pliki do pobrania (PDF, cenniki, formularze)' },
                  { v: 'dla_firm', l: 'Oferta dla firm' },
                  { v: 'kariera', l: 'Praca / kariera' },
                  { v: 'sklep', l: 'Sklep internetowy', h: 'Większy projekt — wymaga osobnego ustalenia.' },
                ],
              },
              {
                l: 'Informacje praktyczne',
                items: [
                  { v: 'przed_wizyta', l: 'Jak przygotować się do wizyty', notp: ['zdrowie', 'noclegi', 'tatuaz'] },
                  { v: 'parking', l: 'Parking i dojazd komunikacją', notp: ['zdrowie', 'noclegi', 'tatuaz'] },
                  { v: 'dostepnosc', l: 'Dostępność dla osób z niepełnosprawnościami', notp: ['zdrowie', 'noclegi', 'tatuaz'] },
                  { v: 'platnosci', l: 'Metody płatności', notp: ['zdrowie', 'noclegi', 'tatuaz'] },
                ],
              },
            ],
          },
          { id: 'sections_notes', type: 'textarea', label: 'Uwagi do sekcji', hint: 'np. „galeria podzielona na fryzury damskie i męskie”, „zespół z krótkim opisem każdej osoby”.', max: 2000 },
        ],
      },

      /* ---------------------------------------------------- 5 */
      {
        id: 'oferta',
        title: 'Oferta i cennik',
        intro: 'Jak pokazać Twoje usługi, żeby klient szybko znalazł to, czego szuka.',
        fields: [
          { id: 'services_list', type: 'textarea', label: 'Wypisz najważniejsze usługi / produkty', hint: 'Wystarczą nazwy — w kolejności od najważniejszych. Pełny cennik prześlesz osobno.', showIf: { notp: ['gastro', 'noclegi', 'budowa', 'uslugi', 'biuro', 'zwierzeta', 'uroda', 'sport', 'edukacja', 'handel', 'turystyka', 'ngo'] }, max: 3000 },
          {
            id: 'services_count', type: 'radio', label: 'Ile mniej więcej usług / produktów chcesz pokazać?', showIf: { notp: ['gastro', 'noclegi'] },
            options: [
              { v: 'do10', l: 'Do 10' },
              { v: '10_30', l: '10–30' },
              { v: '30_60', l: '30–60' },
              { v: 'ponad60', l: 'Ponad 60' },
            ],
          },
          {
            id: 'services_view', type: 'radio', label: 'Jak prezentować usługi?', other: true, showIf: { notp: ['gastro', 'noclegi'] },
            options: [
              { v: 'lista', l: 'Prosta lista z krótkimi opisami' },
              { v: 'kategorie', l: 'Podzielone na kategorie' },
              { v: 'karty', l: 'Karty / kafelki ze zdjęciami' },
              { v: 'podstrony', l: 'Osobna podstrona dla każdej ważnej usługi' },
            ],
          },
          {
            id: 'pricing', type: 'radio', label: 'Jak pokazać ceny?', required: true, other: true, showIf: { notp: ['gastro', 'noclegi'] },
            options: [
              { v: 'pelny', l: 'Pełny cennik z cenami' },
              { v: 'od', l: 'Ceny orientacyjne „od…”' },
              { v: 'widelki', l: 'Przedziały cenowe (od–do)' },
              { v: 'pakiety', l: 'Pakiety z cenami' },
              { v: 'stawka', l: 'Stawka (za godzinę, za m², za osobę)' },
              { v: 'bez_cen', l: 'Tylko lista usług, bez cen' },
              { v: 'indywidualnie', l: 'Informacja „wycena indywidualna”' },
              { v: 'brak', l: 'Bez cennika' },
            ],
          },
          {
            id: 'pricing_details', type: 'checkbox', label: 'Co pokazać przy usługach?', showIf: { notp: ['gastro', 'noclegi'] },
            options: [
              { v: 'czas', l: 'Czas trwania' },
              { v: 'opis', l: 'Krótki opis usługi' },
              { v: 'zdjecie', l: 'Zdjęcie' },
              { v: 'rezerwuj', l: 'Przycisk „Zarezerwuj” przy usłudze' },
              { v: 'warianty', l: 'Warianty (np. długość włosów, rozmiar auta)' },
              { v: 'promocja', l: 'Oznaczenie promocji / nowości' },
            ],
          },
          {
            id: 'pricing_source', type: 'radio', label: 'Skąd wziąć aktualny cennik / menu?', other: true,
            options: [
              { v: 'plik', l: 'Prześlę plik / zdjęcie cennika' },
              { v: 'booksy', l: 'Z mojego profilu w Booksy (wskażę link)' },
              { v: 'strona', l: 'Z obecnej strony / social mediów' },
              { v: 'wpisze', l: 'Wpiszę go samodzielnie w panelu' },
            ],
          },
        ],
      },

      /* ---------------------------------------------------- 6 */
      {
        id: 'kontakt',
        title: 'Kontakt i rezerwacje',
        intro: 'Jak klienci mają się z Tobą kontaktować i umawiać.',
        fields: [
          {
            id: 'booking', type: 'radio', label: 'Jak mają odbywać się rezerwacje / umawianie wizyt?', required: true, other: true,
            showIf: { notp: ['noclegi', 'gastro', 'tatuaz', 'handel', 'turystyka'] },
            options: [
              { v: 'booksy', l: 'Przez Booksy (przycisk / link do mojego profilu)' },
              { v: 'inny_system', l: 'Przez inny istniejący system rezerwacji' },
              { v: 'wlasny', l: 'Chcę własny system rezerwacji na stronie', h: 'Duża funkcja — wymaga osobnego ustalenia zakresu i kosztów utrzymania.' },
              { v: 'formularz', l: 'Formularz „poproś o termin” — oddzwonię / odpiszę' },
              { v: 'telefon', l: 'Tylko telefonicznie' },
              { v: 'brak', l: 'Nie przyjmuję rezerwacji' },
            ],
          },
          { id: 'booksy_link', type: 'url', label: 'Link do profilu Booksy', showIf: { f: 'booking', eq: 'booksy' }, max: 500 },
          {
            id: 'booking_system', type: 'radio', label: 'Z jakiego systemu korzystasz?', other: true,
            showIf: { f: 'booking', eq: 'inny_system' },
            options: [
              { v: 'versum', l: 'Versum' },
              { v: 'moment', l: 'Moment' },
              { v: 'znanylekarz', l: 'ZnanyLekarz' },
              { v: 'fresha', l: 'Fresha' },
              { v: 'calendly', l: 'Calendly' },
              { v: 'google', l: 'Kalendarz Google (strona rezerwacji)' },
            ],
          },
          { id: 'booking_system_link', type: 'url', label: 'Link do strony rezerwacji', showIf: { f: 'booking', eq: 'inny_system' }, max: 500 },
          {
            id: 'booking_embed', type: 'radio', label: 'Jak połączyć stronę z systemem rezerwacji?',
            showIf: { f: 'booking', in: ['booksy', 'inny_system'] },
            options: [
              { v: 'przycisk', l: 'Przycisk „Zarezerwuj” otwierający system' },
              { v: 'widget', l: 'Okienko rezerwacji osadzone na stronie (jeśli system to umożliwia)' },
              { v: 'nie_wiem', l: 'Nie wiem — proszę o rekomendację' },
            ],
          },
          { id: 'own_booking_needs', type: 'textarea', label: 'Opisz, jak ma działać własny system rezerwacji', hint: 'np. liczba pracowników, długości usług, potwierdzenia SMS/e-mail, płatności z góry, odwoływanie wizyt.', showIf: { f: 'booking', eq: 'wlasny' }, max: 3000 },
          {
            id: 'contact_channels', type: 'checkbox', label: 'Jakie formy kontaktu pokazać na stronie?', required: true, other: true,
            options: [
              { v: 'telefon', l: 'Telefon z przyciskiem „Zadzwoń”' },
              { v: 'sms', l: 'SMS' },
              { v: 'email', l: 'E-mail' },
              { v: 'formularz', l: 'Formularz kontaktowy' },
              { v: 'whatsapp', l: 'WhatsApp' },
              { v: 'messenger', l: 'Messenger' },
              { v: 'instagram', l: 'Wiadomość na Instagramie' },
            ],
          },
          { id: 'form_email', type: 'email', label: 'Na jaki adres mają trafiać wiadomości z formularza?', showIf: { f: 'contact_channels', has: 'formularz' }, max: 254 },
          { id: 'opening_hours', type: 'textarea', label: 'Godziny otwarcia', placeholder: 'pon.–pt. 9:00–18:00\nsob. 9:00–14:00', max: 1000 },
          {
            id: 'social', type: 'checkbox', label: 'Gdzie jesteś w internecie? (pokażemy ikony z linkami)', other: true,
            options: [
              { v: 'facebook', l: 'Facebook' },
              { v: 'instagram', l: 'Instagram' },
              { v: 'tiktok', l: 'TikTok' },
              { v: 'youtube', l: 'YouTube' },
              { v: 'linkedin', l: 'LinkedIn' },
              { v: 'google', l: 'Wizytówka Google (Google Maps)' },
              { v: 'booksy', l: 'Booksy' },
            ],
          },
          { id: 'social_links', type: 'textarea', label: 'Linki do profili', placeholder: 'https://facebook.com/…\nhttps://instagram.com/…', max: 2000 },
        ],
      },

      /* ---------------------------------------------------- 7 */
      {
        id: 'marka',
        title: 'Logo i hasło firmy',
        intro: 'Logo, hasło i myśl przewodnia to serce wizerunku. Jeśli czegoś nie masz — opisz swoje oczekiwania, a przygotuję propozycje dopasowane do całego briefu.',
        fields: [
          { id: 'brand_idea', type: 'textarea', label: 'Myśl przewodnia firmy', hint: 'Jednym–dwoma zdaniami: po co istnieje Twoja firma i co klient ma czuć po kontakcie z Tobą. np. „Fryzjer, u którego masz czas tylko dla siebie”, „Naprawiamy auta tak, jakby były nasze”.', max: 1000 },
          {
            id: 'brand_values', type: 'checkbox', label: 'Jakie wartości mają się kojarzyć z firmą? (wybierz 3–5)', other: true,
            options: O('jakosc|Jakość i staranność', 'zaufanie|Zaufanie i uczciwość', 'szybkosc|Szybkość i wygoda', 'doswiadczenie|Doświadczenie i fachowość', 'indywidualnie|Indywidualne podejście', 'rodzinnosc|Rodzinna atmosfera', 'tradycja|Tradycja', 'cena|Przystępna cena', 'lokalnosc|Lokalność', 'eko|Ekologia / natura', 'pasja|Pasja', 'bezpieczenstwo|Bezpieczeństwo', 'radosc|Radość i luz', 'kreatywnosc|Kreatywność'),
          },
          {
            id: 'brand_tone', type: 'radio', label: 'Jak zwracać się do klientów na stronie?',
            options: O('ty|Na „Ty” — bezpośrednio i przyjaźnie', 'pan_pani|Na „Pan / Pani” — oficjalnie', 'bezosobowo|Bezosobowo / „Państwo”', 'nie_wiem|Nie wiem — proszę o rekomendację'),
          },
          {
            id: 'tagline', type: 'radio', label: 'Hasło firmowe (slogan)', required: true,
            options: O('mam|Mam hasło', 'zmiana|Mam, ale chcę nowe', 'propozycja|Nie mam — proszę o propozycje', 'nie|Nie potrzebuję hasła'),
          },
          { id: 'tagline_text', type: 'text', label: 'Twoje hasło', placeholder: 'np. „Strony, które budują wizerunek”', showIf: { f: 'tagline', in: ['mam', 'zmiana'] }, max: 200 },
          {
            id: 'tagline_style', type: 'checkbox', label: 'Jakie ma być nowe hasło?', other: true, showIf: { f: 'tagline', in: ['zmiana', 'propozycja'] },
            options: O('krotkie|Krótkie i łatwe do zapamiętania', 'rzeczowe|Rzeczowe — mówi, co robimy', 'emocjonalne|Emocjonalne — mówi, co klient zyska', 'humor|Z humorem / z przymrużeniem oka', 'eleganckie|Eleganckie', 'miasto|Z nazwą miasta / regionu', 'rym|Rymowane', 'angielskie|Po angielsku'),
          },
          { id: 'tagline_words', type: 'text', label: 'Słowa, które warto (lub nie warto) użyć w haśle', placeholder: 'np. tak: „rodzinnie”, „od 1998”; nie: „profesjonalnie”', showIf: { f: 'tagline', in: ['zmiana', 'propozycja'] }, max: 300 },
          {
            id: 'logo', type: 'radio', label: 'Czy masz logo?', required: true,
            options: [
              { v: 'tak_wektor', l: 'Tak, w dobrej jakości (np. SVG, PDF, AI)' },
              { v: 'tak_obraz', l: 'Tak, ale tylko jako obrazek (PNG/JPG)' },
              { v: 'odswiezenie', l: 'Mam, ale chcę je odświeżyć / zmienić' },
              { v: 'zrobic', l: 'Nie mam — proszę o zaprojektowanie logo', h: 'Przygotuję propozycje dopasowane do Twojej branży, stylu i odpowiedzi z briefu. Zakres ustalimy przed rozpoczęciem.' },
              { v: 'nie', l: 'Nie mam i na razie nie potrzebuję — wystarczy nazwa firmy' },
            ],
          },
          { id: 'logo_send_info', type: 'info', showIf: { f: 'logo', in: ['tak_wektor', 'tak_obraz', 'odswiezenie'] }, text: 'Obecne logo prześlij mi e-mailem w najlepszej jakości, jaką masz (najlepiej SVG, PDF lub PNG z przezroczystym tłem).' },
          { id: 'logo_keep', type: 'textarea', label: 'Co zachować z obecnego logo, a co zmienić?', hint: 'np. „zostawić kolor i liść, zmienić krój pisma na nowocześniejszy”.', showIf: { f: 'logo', eq: 'odswiezenie' }, max: 1500 },
          { id: 'logo_text', type: 'text', label: 'Jaki napis ma być w logo?', placeholder: 'np. pełna nazwa „Salon Ola”, skrót „SO”, nazwa + „Wrocław”', showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] }, max: 150 },
          {
            id: 'logo_type', type: 'radio', label: 'Jaki rodzaj logo?', showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] },
            options: O('znak_napis|Znak graficzny + napis', 'napis|Sam napis (stylizowana nazwa)', 'monogram|Monogram / inicjały', 'emblemat|Emblemat / odznaka (napis w kształcie, np. w kole)', 'nie_wiem|Nie wiem — proszę o propozycje'),
          },
          {
            id: 'logo_feel', type: 'checkbox', label: 'Jaki charakter ma mieć logo?', other: true, showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] },
            options: O('nowoczesne|Nowoczesne', 'klasyczne|Klasyczne / ponadczasowe', 'eleganckie|Eleganckie', 'minimalistyczne|Minimalistyczne', 'odwazne|Odważne / wyraziste', 'przyjazne|Przyjazne / ciepłe', 'zabawne|Zabawne', 'reczne|Odręczne / rzemieślnicze', 'techniczne|Techniczne / precyzyjne', 'naturalne|Naturalne / eko', 'luksusowe|Luksusowe', 'retro|Retro / vintage'),
          },
          { id: 'logo_symbols', type: 'textarea', label: 'Symbole i skojarzenia, które mogą pojawić się w logo', hint: 'np. nożyczki, liść, klucz, dom, fala, góry, litera nazwy. Jeśli nie masz pomysłu — zostaw puste, zaproponuję.', showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] }, max: 1500 },
          { id: 'logo_avoid', type: 'textarea', label: 'Czego unikać w logo?', placeholder: 'np. kolor różowy, clipart, zbyt dużo detali, podobieństwo do logo firmy X', showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] }, max: 1000 },
          {
            id: 'logo_uses', type: 'checkbox', label: 'Gdzie logo będzie używane?', other: true, showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] },
            options: O('strona|Strona internetowa', 'social|Social media (zdjęcie profilowe)', 'szyld|Szyld / witryna', 'wizytowki|Wizytówki i ulotki', 'odziez|Odzież firmowa', 'auto|Oklejenie samochodu', 'opakowania|Opakowania / naklejki', 'pieczatka|Pieczątka / dokumenty', 'haft|Haft / grawer'),
          },
          { id: 'logo_inspirations', type: 'textarea', label: 'Logo, które Ci się podobają (z dowolnych branż)', hint: 'Linki lub nazwy firm i co Ci się w nich podoba. Posłużą tylko jako kierunek — nowe logo będzie oryginalne.', showIf: { f: 'logo', in: ['odswiezenie', 'zrobic'] }, max: 2000 },
        ],
      },

      {
        id: 'wyglad',
        title: 'Wygląd i styl',
        intro: 'Pomóż mi wyczuć charakter, jaki ma mieć strona.',
        fields: [
          {
            id: 'colors', type: 'radio', label: 'Kolory firmowe', other: true,
            options: [
              { v: 'mam', l: 'Mam ustalone kolory (podam poniżej)' },
              { v: 'z_logo', l: 'Dopasuj do logo' },
              { v: 'propozycja', l: 'Proszę o propozycję' },
            ],
          },
          { id: 'colors_list', type: 'text', label: 'Jakie kolory?', placeholder: 'np. granat, złoty, #1a2b3c', showIf: { f: 'colors', eq: 'mam' }, max: 300 },
          {
            id: 'style', type: 'checkbox', label: 'Jak ma wyglądać strona? (charakter wizualny, maksymalnie 3–4)', other: true,
            options: [
              { v: 'nowoczesny', l: 'Nowoczesny' },
              { v: 'elegancki', l: 'Elegancki' },
              { v: 'minimalistyczny', l: 'Minimalistyczny' },
              { v: 'luksusowy', l: 'Luksusowy / premium' },
              { v: 'cieply', l: 'Ciepły i przyjazny' },
              { v: 'naturalny', l: 'Naturalny / eko' },
              { v: 'energiczny', l: 'Energiczny / dynamiczny' },
              { v: 'rodzinny', l: 'Rodzinny' },
              { v: 'profesjonalny', l: 'Rzeczowy / profesjonalny' },
              { v: 'techniczny', l: 'Techniczny / konkretny' },
              { v: 'kreatywny', l: 'Kreatywny / artystyczny' },
              { v: 'mlodziezowy', l: 'Młodzieżowy' },
            ],
          },
          {
            id: 'theme', type: 'radio', label: 'Jasna czy ciemna kolorystyka?',
            options: [
              { v: 'jasna', l: 'Jasna' },
              { v: 'ciemna', l: 'Ciemna' },
              { v: 'mieszana', l: 'Mieszana (np. ciemny nagłówek, jasne sekcje)' },
              { v: 'nie_wiem', l: 'Bez znaczenia / proszę o propozycję' },
            ],
          },
          { id: 'inspirations', type: 'textarea', label: 'Strony, które Ci się podobają', hint: 'Wklej linki i napisz, co w nich lubisz (kolory, układ, zdjęcia, prostotę…).', max: 3000 },
          { id: 'avoid', type: 'textarea', label: 'Czego zdecydowanie nie chcesz?', hint: 'np. „żadnego różu”, „bez animacji”, „nie jak u konkurencji X”.', max: 1500 },
        ],
      },

      /* ---------------------------------------------------- 8 */
      {
        id: 'tresci',
        title: 'Treści i materiały',
        intro: 'Z czego zbudujemy stronę. Wykorzystuję wyłącznie materiały, które wskażesz i na których użycie masz prawo.',
        fields: [
          {
            id: 'texts', type: 'radio', label: 'Kto przygotuje teksty na stronę?', required: true,
            options: [
              { v: 'firma', l: 'Dostarczę gotowe teksty' },
              { v: 'wykonawca', l: 'Proszę o przygotowanie na podstawie moich informacji', h: 'Przygotuję teksty (z pomocą narzędzi AI), a Ty je sprawdzisz i zaakceptujesz.' },
              { v: 'razem', l: 'Częściowo mam, resztę proszę uzupełnić' },
            ],
          },
          {
            id: 'materials', type: 'checkbox', label: 'Jakie materiały możesz przekazać?', other: true,
            options: [
              { v: 'zdj_wnetrze', l: 'Zdjęcia wnętrza / lokalu' },
              { v: 'zdj_zespol', l: 'Zdjęcia zespołu' },
              { v: 'zdj_prace', l: 'Zdjęcia prac / realizacji' },
              { v: 'zdj_produkty', l: 'Zdjęcia produktów' },
              { v: 'opisy', l: 'Opisy usług' },
              { v: 'certyfikaty', l: 'Certyfikaty / dyplomy' },
              { v: 'wideo', l: 'Filmy' },
              { v: 'regulamin', l: 'Regulamin' },
            ],
          },
          {
            id: 'photos', type: 'radio', label: 'Zdjęcia na stronie', required: true, other: true,
            options: [
              { v: 'profesjonalne', l: 'Mam profesjonalne zdjęcia' },
              { v: 'wlasne', l: 'Mam własne zdjęcia (np. z telefonu)' },
              { v: 'social', l: 'Proszę wykorzystać zdjęcia z moich social mediów (wskażę, które)' },
              { v: 'stock', l: 'Proszę dobrać zdjęcia z darmowych banków zdjęć' },
              { v: 'sesja', l: 'Planuję sesję zdjęciową' },
            ],
          },
          { id: 'sources', type: 'textarea', label: 'Skąd mogę wziąć materiały?', hint: 'Wskaż konkretne miejsca: folder na dysku (link), obecna strona, konkretne albumy. Linki do social mediów podałeś już w kroku „Kontakt i rezerwacje”.', max: 2000 },
          { id: 'excluded', type: 'textarea', label: 'Materiały, których NIE chcesz używać', hint: 'np. „zdjęcia od fotografa X”, „stare zdjęcia lokalu sprzed remontu”, „opinie z Facebooka”.', max: 1500 },
          {
            id: 'rights', type: 'checkbox', label: 'Prawa do materiałów',
            options: [
              { v: 'potwierdzam', l: 'Potwierdzam, że wskazane materiały należą do firmy lub firma ma prawo z nich korzystać na stronie.', h: 'Publiczna dostępność (np. na Facebooku) nie oznacza jeszcze prawa do użycia. Ostateczne zgody ustalimy przed rozpoczęciem projektu.' },
            ],
          },
        ],
      },

      /* ---------------------------------------------------- 9 */
      {
        id: 'funkcje',
        title: 'Funkcje i integracje',
        intro: 'Dodatkowe możliwości. Funkcje dobieram do potrzeb — nie każda strona potrzebuje wszystkiego.',
        fields: [
          {
            id: 'panel', type: 'radio', label: 'Czy chcesz samodzielnie zmieniać treści na stronie?', required: true,
            options: [
              { v: 'tak', l: 'Tak — chcę panel do edycji' },
              { v: 'rzadko', l: 'Rzadko — wolę zgłaszać zmiany' },
              { v: 'nie_wiem', l: 'Nie wiem' },
            ],
          },
          {
            id: 'panel_scope', type: 'checkbox', label: 'Co chcesz zmieniać samodzielnie?', other: true,
            showIf: { f: 'panel', eq: 'tak' },
            options: [
              { v: 'teksty', l: 'Teksty' },
              { v: 'cennik', l: 'Cennik' },
              { v: 'zdjecia', l: 'Zdjęcia i galerię' },
              { v: 'godziny', l: 'Godziny otwarcia' },
              { v: 'aktualnosci', l: 'Aktualności / wpisy' },
              { v: 'promocje', l: 'Promocje' },
              { v: 'zespol', l: 'Zespół' },
            ],
          },
          {
            id: 'integrations', type: 'checkbox', label: 'Integracje i dodatki', other: true,
            options: [
              { v: 'opinie_google', l: 'Link / odnośnik do opinii w Google' },
              { v: 'instagram_feed', l: 'Najnowsze zdjęcia z Instagrama na stronie', h: 'Wymaga zgody na pliki cookies od odwiedzających.' },
              { v: 'youtube', l: 'Filmy z YouTube' },
              { v: 'whatsapp', l: 'Pływający przycisk szybkiego kontaktu (telefon / WhatsApp)' },
              { v: 'newsletter', l: 'Zapis do newslettera' },
              { v: 'statystyki', l: 'Statystyki odwiedzin', h: 'Możliwe rozwiązania bez plików cookies.' },
              { v: 'czat', l: 'Czat na stronie' },
              { v: 'platnosci', l: 'Płatności online', h: 'Wymaga osobnego ustalenia.' },
            ],
          },
          {
            id: 'seo', type: 'textarea', label: 'Po jakich hasłach klienci mogą Cię szukać w Google?',
            hint: 'np. „fryzjer Wrocław Krzyki”, „wymiana opon Oleśnica”. Pomogą przygotować treści. (Nie gwarantuję pozycji w wyszukiwarce.)', max: 1500,
          },
        ],
      },

      /* ---------------------------------------------------- 10 */
      {
        id: 'techniczne',
        title: 'Domena i sprawy techniczne',
        intro: 'Domena to adres strony (np. twojafirma.pl). Jej koszt pokrywa firma — ustalimy go przed zakupem.',
        fields: [
          {
            id: 'domain', type: 'radio', label: 'Czy masz już domenę?', required: true,
            options: [
              { v: 'tak', l: 'Tak' },
              { v: 'nie', l: 'Nie — proszę o pomoc w wyborze' },
              { v: 'nie_wiem', l: 'Nie wiem' },
            ],
          },
          { id: 'domain_name', type: 'text', label: 'Jaka to domena i gdzie jest kupiona?', placeholder: 'np. salonola.pl — OVH', showIf: { f: 'domain', eq: 'tak' }, max: 300 },
          { id: 'domain_ideas', type: 'text', label: 'Propozycje nazwy domeny', placeholder: 'np. salonola.pl, ola-fryzjer.pl', showIf: { f: 'domain', eq: 'nie' }, max: 300 },
          {
            id: 'domain_email', type: 'radio', label: 'Czy chcesz adres e-mail w domenie (np. kontakt@twojafirma.pl)?',
            options: [
              { v: 'mam', l: 'Już mam' },
              { v: 'tak', l: 'Tak, chcę' },
              { v: 'nie', l: 'Nie, wystarczy obecny' },
            ],
          },
          {
            id: 'current_site', type: 'radio', label: 'Czy masz obecnie stronę internetową?',
            options: [
              { v: 'tak_zastapic', l: 'Tak — nowa ma ją zastąpić' },
              { v: 'tak_zostawic', l: 'Tak — ale ma zostać obok' },
              { v: 'nie', l: 'Nie' },
            ],
          },
          { id: 'current_site_url', type: 'url', label: 'Adres obecnej strony', showIf: { f: 'current_site', in: ['tak_zastapic', 'tak_zostawic'] }, max: 500 },
          { id: 'current_site_opinion', type: 'textarea', label: 'Co jest dobre, a co złe w obecnej stronie?', showIf: { f: 'current_site', in: ['tak_zastapic', 'tak_zostawic'] }, max: 2000 },
        ],
      },

      /* ---------------------------------------------------- 11 */
      {
        id: 'organizacja',
        title: 'Organizacja',
        intro: 'Ostatnie informacje, żeby współpraca przebiegła sprawnie.',
        fields: [
          {
            id: 'deadline', type: 'radio', label: 'Kiedy strona byłaby Ci potrzebna?', other: true,
            hint: 'To informacja orientacyjna — termin realizacji ustalam indywidualnie.',
            options: [
              { v: 'bez_pospiechu', l: 'Bez pośpiechu' },
              { v: 'miesiac', l: 'W ciągu miesiąca' },
              { v: 'konkretna_data', l: 'Na konkretną datę (np. otwarcie, sezon)' },
            ],
          },
          { id: 'deadline_reason', type: 'text', label: 'Jaka data i z jakiego powodu?', showIf: { f: 'deadline', eq: 'konkretna_data' }, max: 300 },
          { id: 'decision_maker', type: 'text', label: 'Kto akceptuje projekt?', placeholder: 'np. właścicielka — Anna Kowalska', max: 200 },
          {
            id: 'preferred_contact', type: 'checkbox', label: 'Preferowany sposób kontaktu w trakcie projektu',
            options: [
              { v: 'email', l: 'E-mail' },
              { v: 'telefon', l: 'Telefon' },
              { v: 'sms', l: 'SMS / WhatsApp' },
              { v: 'spotkanie', l: 'Spotkanie online' },
            ],
          },
          { id: 'contact_hours', type: 'text', label: 'Kiedy najlepiej się kontaktować?', placeholder: 'np. po 17:00, w poniedziałki', max: 200 },
        ],
      },

      /* ---------------------------------------------------- 12 */
      {
        id: 'pomysly',
        title: 'Twoje pomysły i uwagi',
        intro: 'Miejsce na wszystko, czego nie było w formularzu.',
        fields: [
          { id: 'must_have', type: 'textarea', label: 'Trzy najważniejsze rzeczy, które musi mieć Twoja strona', placeholder: '1. …\n2. …\n3. …', max: 1500 },
          { id: 'ideas', type: 'textarea', label: 'Twoje pomysły, wskazówki i uwagi', hint: 'Wszystko, czego nie było w poprzednich pytaniach: pomysły na sekcje i funkcje, wskazówki („nasz styl to luz i humor”), rzeczy ważne dla Twoich klientów. Nie ma złych pomysłów.', max: 5000 },
          { id: 'tips', legacy: true, type: 'textarea', label: 'Wskazówki dla mnie', hint: 'np. „klienci często pytają o parking”, „ważne, żeby było widać, że mamy dyżury w soboty”, „nasz styl to luz i humor”.', max: 3000 },
          { id: 'concerns', type: 'textarea', label: 'Czy coś Cię niepokoi albo czego chcesz uniknąć we współpracy?', max: 2000 },
          { id: 'questions', type: 'textarea', label: 'Pytania do mnie', max: 2000 },
          { id: 'notes', legacy: true, type: 'textarea', label: 'Inne uwagi', max: 3000 },
        ],
      },
    ],
  };

  /* ---------- Pomocnicze ---------- */

  function allOptions(field) {
    if (field.groups) {
      var out = [];
      field.groups.forEach(function (g) { g.items.forEach(function (i) { out.push(i); }); });
      return out;
    }
    return field.options || [];
  }

  function fieldById(id) {
    for (var s = 0; s < BRIEF.steps.length; s++) {
      var f = BRIEF.steps[s].fields;
      for (var i = 0; i < f.length; i++) if (f[i].id === id) return f[i];
    }
    return null;
  }

  /* ---------- Branże ---------- */
  function industryOf(answers) {
    return (answers && INDUSTRY_INDEX[answers.industry_type]) || null;
  }
  /** Profil pytań: '' (nie wybrano), '_brak' (inna branża) albo np. 'gastro'. */
  function profileOf(answers) {
    var i = industryOf(answers);
    return i ? i.p : '';
  }
  function industryLabel(answers) {
    var i = industryOf(answers);
    if (!i) return '';
    if (i.v === 'inna') return answers.industry ? String(answers.industry).trim() : 'Inna branża';
    return i.l;
  }
  function norm(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  }
  /** Rozpoznaje branżę z dowolnego tekstu (np. pola „Branża” ze zgłoszenia). Zwraca identyfikator albo ''. */
  function guessIndustry(text) {
    var t = ' ' + norm(text).replace(/[^a-z0-9]+/g, ' ') + ' ';
    if (!t.trim()) return '';
    var exact = '';
    Object.keys(INDUSTRY_INDEX).forEach(function (id) { if (norm(INDUSTRY_INDEX[id].l) === norm(text).trim()) exact = id; });
    if (exact) return exact;
    var best = '', bestLen = 0;
    Object.keys(INDUSTRY_INDEX).forEach(function (id) {
      INDUSTRY_INDEX[id].k.forEach(function (kw) {
        var k = norm(kw).replace(/[^a-z0-9]+/g, ' ');
        // dopasowanie od początku słowa (rdzeń), dłuższe dopasowanie wygrywa
        var words = k.split(' ');
        // krótkie słowa (np. „spa”, „pub”, „dj”) tylko jako całe wyrazy, z krótką końcówką odmiany
        var re = new RegExp('\\s' + words.join('[a-z]*\\s') + (k.length <= 3 ? '[a-z]{0,2}\\s' : ''));
        if (re.test(t) && k.length > bestLen) { best = id; bestLen = k.length; }
      });
    });
    return best;
  }

  /** Czy warunek showIf / requiredIf jest spełniony? */
  function cond(c, answers) {
    if (!c) return true;
    var prof = profileOf(answers);
    if (c.p && c.p.indexOf(prof) === -1) return false;
    if (c.notp && c.notp.indexOf(prof) !== -1) return false;
    if (c.ind && c.ind.indexOf(answers.industry_type) === -1) return false;
    if (c.notind && c.notind.indexOf(answers.industry_type) !== -1) return false;
    if (c.f) {
      var parent = fieldById(c.f);
      if (parent && !isVisible(parent, answers)) return false;
      var v = answers[c.f];
      if (c.eq !== undefined && v !== c.eq) return false;
      if (c.neq !== undefined && v === c.neq) return false;
      if (c.in && c.in.indexOf(v) === -1) return false;
      if (c.has && !(Array.isArray(v) && v.indexOf(c.has) !== -1)) return false;
      if (c.not && !((Array.isArray(v) && v.some(function (x) { return c.not.indexOf(x) === -1; })) || Boolean(answers[c.f + '__other']))) return false;
    }
    return true;
  }

  /** Czy pole jest widoczne przy danych odpowiedziach? */
  function isVisible(field, answers) {
    return cond(field.showIf, answers);
  }

  function isRequired(field, answers) {
    return Boolean(field.required) || Boolean(field.requiredIf && cond(field.requiredIf, answers));
  }

  /** Czy opcja (np. sekcja branżowa) ma być widoczna? Bez wybranej branży — pokazujemy wszystkie. */
  function optionVisible(o, answers) {
    var prof = profileOf(answers);
    if (o.notp && o.notp.indexOf(prof) !== -1) return false;
    if (!o.p) return true;
    if (!prof || prof === '_brak') return true;
    return o.p.indexOf(prof) !== -1;
  }

  /** Polecane układy dla wybranej branży (lista identyfikatorów). */
  function recommendedLayouts(answers) {
    return LAYOUT_BY_INDUSTRY[answers.industry_type] || LAYOUT_BY_PROFILE[profileOf(answers)] || [];
  }
  function layoutById(v) {
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].v === v) return LAYOUTS[i];
    return null;
  }

  function isRecommended(field, o, answers) {
    if (field.layouts) return recommendedLayouts(answers).indexOf(o.v) !== -1;
    if (!field.recommend) return false;
    var prof = PROFILES[profileOf(answers)];
    return Boolean(prof && prof.rec.indexOf(o.v) !== -1);
  }

  /** Wstęp kroku (krok branżowy zależy od wybranej branży). */
  function stepIntro(step, answers) {
    if (step.id !== 'branza') return step.intro || '';
    var i = industryOf(answers);
    if (!i) return 'W kroku 1 nie wybrano branży — poniżej pytania ogólne.';
    if (i.v === 'inna') return 'Kilka pytań, które pomogą mi zrozumieć specyfikę Twojej działalności.';
    return 'Pytania dopasowane do branży: ' + i.l + '. Jeśli zmienisz branżę w kroku 1, pytania zmienią się automatycznie.';
  }

  function isEmpty(field, answers) {
    var v = answers[field.id];
    var other = answers[field.id + '__other'];
    if (field.type === 'checkbox') return !(Array.isArray(v) && v.length) && !(other && String(other).trim());
    if (field.type === 'radio' || field.type === 'select') return !v || (v === '__other' && !(other && String(other).trim()));
    return !(v && String(v).trim());
  }

  /** Lista brakujących wymaganych pól: [{step, field}] */
  function missingRequired(answers) {
    var out = [];
    BRIEF.steps.forEach(function (step, si) {
      step.fields.forEach(function (f) {
        if (f.type !== 'info' && isRequired(f, answers) && isVisible(f, answers) && isEmpty(f, answers)) out.push({ step: si, field: f });
      });
    });
    return out;
  }

  /** Czytelna wartość odpowiedzi (tekst). */
  function formatValue(field, answers) {
    if (field.type === 'info') return '';
    var v = answers[field.id];
    var other = answers[field.id + '__other'];
    var opts = allOptions(field);
    var label = function (val) {
      for (var i = 0; i < opts.length; i++) if (opts[i].v === val) return opts[i].l;
      return val;
    };
    if (field.type === 'checkbox') {
      var parts = (Array.isArray(v) ? v : []).map(label);
      if (other && String(other).trim()) parts.push('Inne: ' + String(other).trim());
      return parts.join('; ');
    }
    if (field.type === 'radio' || field.type === 'select') {
      if (v === '__other') return other ? 'Inne: ' + String(other).trim() : '';
      return v ? label(v) : '';
    }
    return v ? String(v).trim() : '';
  }

  /** Tekst (Markdown) gotowy do wklejenia do narzędzia AI lub notatek. */
  function toMarkdown(answers, meta) {
    meta = meta || {};
    var lines = [];
    lines.push('# Brief strony internetowej: ' + (answers.company_name || meta.company_name || 'firma'));
    var il = industryLabel(answers);
    if (il) lines.push('Branża: ' + il);
    if (meta.submitted_at) lines.push('Wypełniono: ' + meta.submitted_at);
    lines.push('');
    BRIEF.steps.forEach(function (step) {
      var rows = [];
      step.fields.forEach(function (f) {
        if (!isVisible(f, answers)) return;
        var val = formatValue(f, answers);
        if (!val) return;
        if (val.indexOf('\n') !== -1) rows.push('- **' + f.label + ':**\n  ' + val.replace(/\n/g, '\n  '));
        else rows.push('- **' + f.label + ':** ' + val);
      });
      if (rows.length) {
        lines.push('## ' + step.title);
        lines.push.apply(lines, rows);
        lines.push('');
      }
    });
    return lines.join('\n').trim() + '\n';
  }

  /* ---------- Logo i hasło ---------- */
  function needsLogo(a) { return a.logo === 'zrobic' || a.logo === 'odswiezenie'; }
  function needsTagline(a) { return a.tagline === 'propozycja' || a.tagline === 'zmiana'; }

  BRIEF.industries = INDUSTRY_GROUPS;
  BRIEF.layouts = LAYOUTS;
  BRIEF.profiles = PROFILES;

  BRIEF.helpers = {
    allOptions: allOptions,
    fieldById: fieldById,
    isVisible: isVisible,
    isRequired: isRequired,
    optionVisible: optionVisible,
    isRecommended: isRecommended,
    recommendedLayouts: recommendedLayouts,
    layoutById: layoutById,
    stepIntro: stepIntro,
    industryOf: industryOf,
    industryLabel: industryLabel,
    profileOf: profileOf,
    guessIndustry: guessIndustry,
    isEmpty: isEmpty,
    missingRequired: missingRequired,
    formatValue: formatValue,
    toMarkdown: toMarkdown,
    needsLogo: needsLogo,
    needsTagline: needsTagline,
  };

  root.BRIEF_SCHEMA = BRIEF;
})(typeof window !== 'undefined' ? window : globalThis);
