import type { EventType } from '@tren/shared';

/** Single source of truth for the marketing copy on the landing page. */

export const HERO_EYEBROW = 'Galerija sa vašeg događaja · bez aplikacije';

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Napravi događaj',
    body: 'Unesi imena, datum i tip događaja. Za par sekundi dobijaš QR kod i link za goste.',
  },
  {
    step: '02',
    title: 'Podeli QR sa gostima',
    body: 'Odštampaj QR za stolove ili ga pošalji u grupu. Gost skenira, upiše ime i šalje — bez instalacije aplikacije.',
  },
  {
    step: '03',
    title: 'Sve na jednom mestu',
    body: 'Fotografije i video stižu u zajedničku galeriju u realnom vremenu. Preuzmi sve kao ZIP kad poželiš.',
  },
] as const;

export const FEATURES = [
  {
    icon: 'qr',
    title: 'Bez aplikacije',
    body: 'Gost otvara običnu web stranicu sa telefona. Radi na svakom iOS i Android uređaju.',
  },
  {
    icon: 'bolt',
    title: 'Direktan upload',
    body: 'Fajlovi idu pravo u sigurno skladište, bez kompresije i bez čekanja na server.',
  },
  {
    icon: 'lock',
    title: 'PIN zaštita',
    body: 'Galerija može biti javna ili zaključana PIN-om koji delíš samo sa zvanicama.',
  },
  {
    icon: 'download',
    title: 'ZIP izvoz',
    body: 'Jednim klikom preuzimaš sve fotografije i video u punoj rezoluciji.',
  },
  {
    icon: 'clock',
    title: 'Čuvanje po paketu',
    body: 'Free čuva 7 dana, Premium 90 dana. Uvek znaš do kada je galerija dostupna.',
  },
  {
    icon: 'chart',
    title: 'Pregled uživo',
    body: 'Dashboard pokazuje koliko je fotografija stiglo i koliko gostiju je učestvovalo.',
  },
] as const;

export interface PricingPlan {
  id: 'free' | 'premium' | 'partner';
  name: string;
  price: string;
  priceNote: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  cta: { label: string; href: string };
}

export const PRICING: PricingPlan[] = [
  {
    id: 'free',
    name: 'Besplatan',
    price: '0 RSD',
    priceNote: 'zauvek besplatno',
    features: [
      'Do 100 fotografija i video snimaka',
      'QR kod i deljivi link',
      'Zajednička galerija',
      'Javna ili PIN zaštićena galerija',
      'Čuvanje 7 dana',
    ],
    cta: { label: 'Počni besplatno', href: '/register' },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '2.490 RSD',
    priceNote: 'po događaju',
    highlight: true,
    badge: 'Najpopularniji',
    features: [
      'Neograničeno fotografija i videa',
      'Čuvanje 90 dana',
      'Preuzimanje u punoj rezoluciji (ZIP)',
      'Bez Tren oznake u galeriji',
      'Prioritetna podrška',
    ],
    cta: { label: 'Izaberi Premium', href: '/register?plan=premium' },
  },
  {
    id: 'partner',
    name: 'Partner · White-label',
    price: 'Na upit',
    priceNote: 'za sale, fotografe i planere',
    features: [
      'Vaš brend i boje',
      'Više događaja pod jednim nalogom',
      'Objedinjeno fakturisanje',
      'Nalozi za tim',
      'Prilagođen domen',
    ],
    cta: { label: 'Zakaži razgovor', href: '/register?plan=partner' },
  },
];

export const AUDIENCE: { title: string; body: string; type: EventType }[] = [
  { title: 'Venčanja', body: 'Svaki ugao proslave iz ugla gostiju, ne samo fotografa.', type: 'wedding' },
  { title: 'Rođendani', body: 'Od dečjih žurki do okruglih godina — sve fotke na jednom mestu.', type: 'birthday' },
  { title: 'Korporativni događaji', body: 'Konferencije, timbildinzi i proslave firme, spremni za deljenje.', type: 'corporate' },
  { title: 'Sve ostalo', body: 'Krštenja, maturske, godišnjice, ispraćaji — bilo koji povod.', type: 'other' },
];

export const FAQ = [
  {
    q: 'Moraju li gosti da instaliraju aplikaciju?',
    a: 'Ne. Gost skenira QR kod ili otvori link, upiše ime i šalje fotografije direktno iz browsera. Radi na svakom modernom telefonu.',
  },
  {
    q: 'Da li gosti prave nalog?',
    a: 'Nikada. Nalog je potreban samo organizatoru za upravljanje događajem. Gost samo unese ime koje se zapamti na njegovom telefonu.',
  },
  {
    q: 'Ko može da vidi galeriju?',
    a: 'Vi birate. Galerija može biti javna (svako sa linkom) ili zaključana PIN-om koji delíte samo sa zvanicama. PIN se čuva bezbedno i proverava na serveru.',
  },
  {
    q: 'Koliko dugo se čuvaju fotografije?',
    a: 'Free paket čuva galeriju 7 dana, Premium 90 dana od kreiranja događaja. Pre isteka preuzmete sve kao ZIP.',
  },
  {
    q: 'Da li se gubi kvalitet fotografija?',
    a: 'Ne. Fajlovi se otpremaju direktno u skladište u originalnoj rezoluciji, bez dodatne kompresije.',
  },
  {
    q: 'Imam salu / fotografski studio — mogu li da ga nudim svojim klijentima?',
    a: 'Da. Partner (white-label) paket vam daje sopstveni brend, više događaja pod jednim nalogom i objedinjeno fakturisanje. Javite se i dogovaramo detalje.',
  },
];

export const STATS = [
  { value: '30 s', label: 'do gotovog QR koda' },
  { value: '0', label: 'aplikacija za instaliranje' },
  { value: '90', label: 'dana čuvanja na Premium-u' },
  { value: '1 klik', label: 'za preuzimanje cele galerije' },
];
