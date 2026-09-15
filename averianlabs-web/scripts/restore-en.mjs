// One-shot restore of messages/en.json from the Finnish source.
// Run: node scripts/restore-en.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const target = resolve(__dirname, "../messages/en.json")
const source = resolve(__dirname, "../messages/fi.json")

const fi = JSON.parse(readFileSync(source, "utf8"))

// Hand-built Finnish → English dictionary for known UI tokens.
// Unknown values fall through to the Finnish string with a TODO marker so we
// can fix them manually.
const dict = {
  // meta
  "AverianLabs — Tarkkoja peptidejä vakavaan tutkimukseen":
    "AverianLabs — Precision peptides for serious research",
  "EU:sta toimitettavat, kolmannen osapuolen HPLC-verifioidut tutkimuspeptidit. COA jokaiselle erälle.":
    "EU-dispatched, third-party HPLC-verified research peptides. COA on every batch.",
  "tutkimuspeptidit, BPC-157, semaglutidi, tirzepatidi, TB-500, GHK-Cu, EU, Suomi, COA, HPLC":
    "research peptides, BPC-157, semaglutide, tirzepatide, TB-500, GHK-Cu, EU, Finland, COA, HPLC",

  // research
  "Vain tutkimuskäyttöön. Ei ihmisille tai eläimille.":
    "For research use only. Not for human or animal use.",
  "Kaikki AverianLabsin myymät tuotteet on tarkoitettu ainoastaan laboratoriotutkimukseen ja in-vitro -tutkimuksiin. Niitä ei ole tarkoitettu ihmisravinnoksi, diagnostiseen käyttöön tai terapeuttisiin sovelluksiin. Ostamalla vahvistat olevasi pätevä tutkija tai institutionaalinen ostaja.":
    "All products sold by AverianLabs are intended solely for laboratory research and in-vitro studies. They are not intended for human consumption, diagnostic use, or therapeutic applications. By purchasing, you confirm you are a qualified researcher or institutional buyer.",

  // nav
  Kauppa: "Shop",
  Laboratoriotestit: "Lab Tests",
  Laskuri: "Calculator",
  Tietoa: "About",
  Tili: "Account",
  Ostoskori: "Cart",
  Yhteisö: "Community",
  "Siirry sisältöön": "Skip to content",
  Search: "Search",

  // home
  "EU · Tutkimuslaatu · Kolmannen osapuolen testaama": "EU · Research-grade · Third-party tested",
  "EU:sta toimitettuna. HPLC + endotoksiini verifioitu. Täysi analyysitodistus jokaiselle erälle. Tutkijoille, jotka eivät tee kompromisseja.":
    "Dispatched from the EU. HPLC + endotoxin verified. Full certificate of analysis on every batch. For researchers who don't compromise.",
  "Selaa valikoimaa": "Browse the catalog",
  "Lue tutkimusta": "Read the research",
  "Miksi tutkijat valitsevat AverianLabsin": "Why researchers choose AverianLabs",
  "EU-GMP-toimittajaverkosto": "EU-GMP vendor network",
  "HPLC-puhtaus ≥ 98 %": "HPLC purity ≥ 98%",
  "Endotoksiini < 5 EY/mg": "Endotoxin < 5 EU/mg",
  "24h EU-lähetys": "24h EU dispatch",
  "ISO 17025 -laboratoriokumppani": "ISO 17025 lab partner",
  "GDPR-yhteensopiva": "GDPR compliant",
  "Suosituimmat tutkimuspeptidit": "Featured research peptides",
  "Vedä kokeaksesi kidekaruselli — jokainen pullo toimitetaan eräkohtaisella COA:lla.":
    "Drag the crystal carousel — every vial ships with a batch-specific COA.",
  "Selaa tutkimusalueittain": "Browse by research area",
  "Metabolinen tutkimus": "Metabolic research",
  "Semaglutidi, Tirzepatidi, AOD-9604": "Semaglutide, Tirzepatide, AOD-9604",
  "Toipuminen & kudos": "Recovery & tissue",
  "BPC-157, TB-500, GHK-Cu": "BPC-157, TB-500, GHK-Cu",
  Kognitiivinen: "Cognitive",
  "Semax, Selank, Cerebrolysin": "Semax, Selank, Cerebrolysin",
  Pitkäikäisyys: "Longevity",
  "Epitalon, GHK-Cu, NAD+": "Epitalon, GHK-Cu, NAD+",
  "Kosmeettinen tutkimus": "Cosmetic research",
  "GHK-Cu, Melanotan II": "GHK-Cu, Melanotan II",
  "Läpinäkyvyys jokaisella erällä": "Full transparency on every batch",
  "Jokaisen pullon mukana tulee julkinen analyysitodistus. Klikkaa erätunnusta nähdäksesi HPLC-kromatogrammit, massaspektrometria-tulokset ja endotoksiinipaneelit.":
    "Every vial ships with a public certificate of analysis. Click a batch ID to view HPLC chromatograms, mass-spec results and endotoxin panels.",
  Liuotuslaskuri: "Reconstitution calculator",
  "Lopeta päässälasku. Laske veto-oppimäärät, pitoisuudet ja annokset sekunneissa.":
    "Stop doing the math in your head. Calculate draw volumes, concentrations and doses in seconds.",
  "Avaa laskuri": "Open calculator",
  Tutkimuspöydältä: "From the research bench",
  "Tutkimuslaitokset & jälleenmyyjät": "For institutions & resellers",
  "Volyymihinnoittelu, NET-14-laskutus, oma yhteyshenkilö. Hae kerran, vastaus 48 tunnissa.":
    "Volume pricing, NET-14 invoicing, a dedicated contact. Apply once, hear back in 48 hours.",
  "Hae kumppanihinnoittelua": "Apply for partner pricing",
  "Kuukausittaiset tutkimuspäivitykset": "Monthly research updates",
  "Uusia peptidejä, kirjallisuutta, laboratoriomuistiinpanoja. Ei roskapostia.":
    "New peptides, literature, lab notes. No spam.",
  "sinun@laitos.fi": "you@lab.eu",
  Tilaa: "Subscribe",
  Yhdistelmät: "Blends",
  "KLOW, BPC+TB-500, räätälöidyt peptidiseokset": "KLOW, BPC+TB-500, custom peptide blends",

  // shop
  Tutkimusvalikoima: "Research catalog",
  "Kaikki tuotteet · HPLC-testattu · COA jokaisella erällä":
    "All products · HPLC tested · COA on every batch",
  "Hae peptidejä…": "Search peptides…",
  "Paina ⌘K": "Press ⌘K",
  Suodattimet: "Filters",
  Kategoria: "Category",
  Puhtaus: "Purity",
  Pullokoko: "Vial size",
  Hinta: "Price",
  Varastossa: "In stock",
  Järjestä: "Sort",
  Uusimmat: "Newest",
  "Hinta: nouseva": "Price: ascending",
  "Hinta: laskeva": "Price: descending",
  Nimi: "Name",
  Ruudukko: "Grid",
  "3D": "3D",
  Lista: "List",
  "Ei tuotteita valituilla suodattimilla.": "No products match the selected filters.",
  "{count, plural, =0 {Ei tuloksia} one {# tuote} other {# tuotetta}}":
    "{count, plural, =0 {No results} one {# product} other {# products}}",
  "Vain {n} jäljellä": "Only {n} left",
  Loppu: "Out of stock",
  "Alkaen {price}": "From {price}",
  "{purity}% puhtaus": "{purity}% purity",

  // product
  "Lisää ostoskoriin": "Add to cart",
  "Valitse pullokoko": "Select vial size",
  Määrä: "Quantity",
  "Tekniset tiedot": "Specifications",
  "CAS-numero": "CAS number",
  Molekyylikaava: "Molecular formula",
  Molekyylipaino: "Molecular weight",
  Sekvenssi: "Sequence",
  Säilytys: "Storage",
  Kuvaus: "Description",
  Tiedot: "Specs",
  "COA & laboratoriotestit": "COA & lab tests",
  Liuotus: "Reconstitution",
  Tutkimus: "Research",
  UKK: "FAQ",
  "Liittyvät peptidit": "Related peptides",
  "Varastossa — lähtee 24h sisällä": "In stock — ships within 24h",
  "Vain {n} pulloa jäljellä": "Only {n} vials left",
  "Loppu — ilmoita minulle": "Out of stock — notify me",
  "Sis. ALV:n. Lopullinen hinta kassalla.": "Incl. VAT. Final price at checkout.",
  "Uusin erä": "Latest batch",
  "Näytä COA": "View COA",
  "Testattu laboratoriossa {lab}": "Tested at {lab}",
  "Ilmoita kun saatavilla": "Notify me when available",
  "Ilmoitamme sinulle sähköpostilla.": "We'll email you.",

  // cart
  "Ostoskorisi on tyhjä.": "Your cart is empty.",
  Välisumma: "Subtotal",
  Toimitus: "Shipping",
  ALV: "VAT",
  Yhteensä: "Total",
  Kassalle: "Checkout",
  Poista: "Remove",
  Kampanjakoodi: "Promo code",
  Käytä: "Apply",
  "Käytä {points} pistettä (−{amount})": "Use {points} points (−{amount})",
  "Valitsemasi peptidit ja tarvikkeet — valmiina tarkistettavaksi.":
    "Your selected peptides and supplies — ready for review.",
  "Best sellers": "Best sellers",
  "Continue shopping": "Continue shopping",
  "Secure checkout": "Secure checkout",
  "Add {amount} more for free EU shipping": "Add {amount} more for free EU shipping",

  // checkout
  Sähköposti: "Email",
  "Jatka vierailijana": "Continue as guest",
  "Kirjaudu tai luo tili": "Sign in or create an account",
  Osoite: "Address",
  Maksu: "Payment",
  Vahvistus: "Confirmation",
  "Minulla on ALV-tunnus (yritysosto)": "I have a VAT ID (business purchase)",
  "Vahvistetaan…": "Validating…",
  "✓ Voimassa oleva EU ALV-tunnus": "✓ Valid EU VAT ID",
  "✗ Virheellinen ALV-tunnus": "✗ Invalid VAT ID",
  Pikamaksu: "Express checkout",
  Maksa: "Pay with",
  "Tee tilaus": "Place order",
  "Käsitellään…": "Processing…",
  "Tilaus vahvistettu": "Order confirmed",
  "Tilaus #{number}": "Order #{number}",
  "Lähetimme kuitin ja COA-PDF:t osoitteeseen {email}":
    "We sent the receipt and COA PDFs to {email}",
  "Jatka ostoksia": "Continue shopping",

  // footer
  "Tarkkoja peptidejä vakavaan tutkimukseen.": "Precision peptides for serious research.",
  Yritys: "Company",
  Oikeudellinen: "Legal",
  Tuki: "Support",
  Sanasto: "Glossary",
  Tutkimusblogi: "Research blog",
  "Tietoa meistä": "About us",
  Laatu: "Quality",
  Kumppaniohjelma: "Partner program",
  Yhteystiedot: "Contact",
  "Toimitus & palautukset": "Shipping & returns",
  Ehdot: "Terms",
  Tietosuoja: "Privacy",
  Evästeet: "Cookies",
  Tutkimusvakuutus: "Research disclaimer",
  Uutiskirje: "Newsletter",
  "© {year} AverianLabs. Kaikki oikeudet pidätetään.": "© {year} AverianLabs. All rights reserved.",
  "ALV-tunnus": "VAT ID",
  "Vain tutkimuskäyttöön. Ei ihmisravinnoksi.": "Research use only. Not for human consumption.",

  // cookie
  "Evästeet & analytiikka": "Cookies & analytics",
  "Käytämme evästeitä ostoskorin toimintaan ja (suostumuksellasi) sivuston käytön analysointiin.":
    "We use cookies for cart functionality and (with consent) site usage analytics.",
  "Hyväksy kaikki": "Accept all",
  "Hylkä ei-välttämättömät": "Reject non-essential",
  Asetukset: "Settings",

  // ageGate
  "Oletko 18 vuotta täyttänyt?": "Are you 18 or older?",
  "Tutkimuspeptidit on tarkoitettu päteville tutkijoille ja institutionaalisille ostajille.":
    "Research peptides are intended for qualified researchers and institutional buyers.",
  "Kyllä, olen 18+": "Yes, I am 18+",
  "En, poistu": "No, leave",

  // common
  "Ladataan…": "Loading…",
  "Jotain meni pieleen.": "Something went wrong.",
  "Yritä uudelleen": "Try again",
  Sulje: "Close",
  Avaa: "Open",
  Edellinen: "Previous",
  Seuraava: "Next",
  Hae: "Search",
  Suodata: "Filter",
  Näkymä: "View",
  Lisää: "More",
  Vähemmän: "Less",
  "Näytä kaikki": "View all",
  "Lue lisää": "Read more",
  "Tilauksen yhteenveto": "Order summary",
  Ilmainen: "Free",
  "Tilaa tutkimuskatsaus": "Subscribe to research digest",
  "Lähetämme kerran kuussa uusia peptidejä, tuoretta kirjallisuutta ja laboratoriomuistiinpanoja.":
    "Once a month we send new peptides, fresh literature and lab notes.",

  // averia
  "Online · tutkimusneuvoja": "Online · research concierge",
  "Avaa Averia": "Open Averia",
  "Tyhjennä keskustelu": "Clear conversation",
  "Kysy tuotteista, COA:sta, liuotuksesta…": "Ask about products, COAs, reconstitution…",
  "Hei — olen Averia.": "Hi — I'm Averia.",
  "Voin auttaa selaamaan valikoimaa, tarkistamaan COA-tietoja, vertailemaan tuotteita tai auttaa tilauksen kanssa.":
    "I can help browse the catalog, check COA details, compare products, or assist with an order.",
  "Jotain meni pieleen": "Something went wrong",
  "Averia ei juuri nyt vastannut. Yritä hetken kuluttua uudelleen.":
    "Averia didn't respond just now. Try again in a moment.",
  "Muistetaanko tämä keskustelu?": "Remember this conversation?",
  "Averia voi tallentaa keskustelun, jotta voit jatkaa siitä mihin jäit, ja oppia asetuksesi (suosikkipullokoot, tutkimuskohteen).":
    "Averia can save the conversation so you can pick up where you left off, and learn your preferences (favourite vial sizes, research area).",
  "Pitää kontekstin mukana laitteellasi tulevilla käynneillä":
    "Keeps context across future visits on this device",
  "Voit tyhjentää, viedä tai poistaa kaiken milloin tahansa":
    "You can clear, export or delete everything anytime",
  "Salli ja tallenna": "Allow and save",
  "Älä tallenna": "Don't save",
  "Suosittele minulle": "Recommend for me",
  "Voisitko suositella muutamia tutkimuspeptidejä tavoitteideni perusteella? Kysy muutama kysymys rajaamiseen.":
    "Could you recommend a few research peptides based on my goals? Ask a few questions to narrow it down.",
  "Vertaile tuotteita": "Compare products",
  "Mitkä kaksi tuotettanne ovat yleisimmin vertailtuja, ja miten ne eroavat?":
    "Which two of your products are most commonly compared, and how do they differ?",
  "Seuraa tilaustani": "Track my order",
  "Miten voin tarkistaa olemassa olevan tilauksen tilan?":
    "How can I check the status of an existing order?",
  Liuotusohje: "Reconstitution walkthrough",
  "Käy kanssani läpi tutkimuspeptidipullon liuotus vaihe vaiheelta.":
    "Walk me through reconstituting a research-peptide vial, step by step.",
  "Lähteet:": "Sources:",
  Tuotekenttä: "Product field",
  "Laboratoriodokumentti / COA": "Lab document / COA",
  Markkinasääntö: "Market regulation",
  Yhteisöketju: "Community thread",
  Sanastotermi: "Glossary term",

  // admin
  Hallintapaneeli: "Dashboard",
  Yleiskatsaus: "Overview",
  Moderointi: "Moderation",
  "Liputettu sisältö": "Flagged content",
  "COA, SDS, HPLC, …": "COA, SDS, HPLC, …",
  "Audit-loki": "Audit log",
  "Jokainen admin-toiminto": "Every admin action",
  "Kirjaudu ulos": "Sign out",
  "Odottava moderointi": "Pending moderation",
  "tapahtumaa viim. 24h": "events in last 24h",
  "Uudet jäsenet": "New members",
  "viim. 7 päivää": "last 7 days",
  "Jaetut suunnitelmat": "Shared plans",
  "Uudet ketjut": "New threads",
  "Dokumentteja yhteensä": "Total documents",
  "kaikki 7 tyyppiä": "all 7 types",

  // community
  "Tutkimuskäyttöön tarkoitettu tila päteville tutkijoille, laboratorion henkilökunnalle ja institutionaalisille ostajille.":
    "A research-use-only space for qualified researchers, lab staff and institutional buyers.",
  "Lue yhteisön säännöt": "Read the community rules",
  "Uusi ketju": "New thread",
  "Kirjaudu sisään julkaistaksesi": "Sign in to post",
  Kirjaudu: "Sign in",
  Keskustelukategoriat: "Discussion categories",
  "Valitse kategoria ja sukella sisään.": "Pick a category and dive in.",
  "Ahkerimmat kirjoittajat": "Top contributors",
  "Jäsenet kerryttävät mainetta saamistaan reaktioista.":
    "Members earn reputation from reactions they receive.",
  "Viimeisin toiminta": "Recent activity",
  "Tänään peptiditieteessä": "Today in peptide science",
  "Live-koonti ketjuista ja vastauksista.": "Live digest of threads and replies.",
  "Aloita uusi ketju": "Start a new thread",
  "Ole tarkka. Siteeraa lähteitä mahdollisuuksien mukaan.":
    "Be precise. Cite sources where possible.",
  Otsikko: "Title",
  Sisältö: "Body",
  "Markdown on tuettu. Viestit tarkastaa automaattinen moderaattori.":
    "Markdown supported. Messages are auto-moderated.",
  "Julkaise ketju": "Post thread",
  "Julkaistaan…": "Posting…",
  Vastaa: "Reply",
  "Lisää keskusteluun…": "Add to the conversation…",
  "Lähetä vastaus": "Post reply",
  "Ketjut tässä kategoriassa": "Threads in this category",
  "{replies} vastausta · {views} katselua · kirjoittaja {author}":
    "{replies} replies · {views} views · by {author}",
  kirjoittaja: "by",
  "Alkuperäinen viesti": "Original post",
  "Tämä ketju on lukittu.": "This thread is locked.",
  "Moderaattori poisti tämän viestin.": "A moderator removed this message.",
  "Tämä viesti merkitty tarkastettavaksi.": "This message is flagged for review.",
  "Nämä ovat neuvottelemattomia.": "These are non-negotiable.",
  "Vain tutkimuskonteksti.": "Research context only.",
  "Ihmis- tai eläinlääkinnällinen annostelu ei ole sallittua.":
    "Human or veterinary dosing is not permitted.",
  "Ei hankintaa tai myyjämarkkinointia.": "No sourcing or vendor solicitation.",
  "Älä kysy mistä ostaa tai mainosta kilpailevia myyjiä.":
    "Don't ask where to buy or advertise competing sellers.",
  "Ei yhteystietoja viesteihin.": "No contact info in posts.",
  "Sähköposti, puhelin, some-tunnukset — pidä ne pois.":
    "Email, phone, social handles — keep them out.",
  "Siteeraa lähteet väitteille.": "Cite sources for claims.",
  "Linkitä vertaisarvioitu artikkeli tai tuotteen COA.":
    "Link a peer-reviewed paper or product COA.",
  "Kunnioita moderaattoreita.": "Respect moderators.",
  "Ihmisjonon päätökset ovat lopullisia.": "Human-staff decisions are final.",
  "Yksi tili henkilöä kohden.": "One account per person.",
  "Kiertäminen johtaa pysyvään porttikieltoon.": "Circumvention leads to a permanent ban.",
  "Pysy aiheessa.": "Stay on topic.",
  "Off-topic menee lounge-kategoriaan.": "Off-topic goes in the lounge category.",
  "Ei vielä ketjuja — ole ensimmäinen.": "No threads yet — be first.",
  "Ei vielä vastauksia.": "No replies yet.",
  Hyödyllä: "Helpful",
  Oivaltava: "Insightful",
  Kiitos: "Thanks",
  Ilmianna: "Report",
  "Ilmianna tämä viesti": "Report this post",
  Syy: "Reason",
  "3–200 merkkiä.": "3–200 characters.",
  "Lisätiedot (valinnainen)": "Additional details (optional)",
  "Lähetä ilmianto": "Submit report",
  "Kiitos — moderaattorit tarkastavat.": "Thanks — moderators will review.",
  Uusi: "New",
  Avustaja: "Contributor",
  Analyytikko: "Analyst",
  Vanhempi: "Senior",
  Fellow: "Fellow",
  "{current} / {target} seuraavaan: {next}": "{current} / {target} to next: {next}",
  "Julkaisu epäonnistui": "Post failed",
  "Moderaattorijärjestelmä esti viestisi.": "The moderator system blocked your message.",
  "Moderaattorin huomautus": "Moderator note",
  "Ei vielä toimintaa.": "No activity yet.",
  "Ole ensimmäinen.": "Be first.",
  Tiedotteet: "Announcements",
  "AverianLabs-tiimin viralliset viestit.": "Official posts from the AverianLabs team.",
  Tutkimuskeskustelu: "Research discussion",
  "Yleistä keskustelua peptiditieteestä.": "General discussion of peptide science.",
  "Dokumentaatio ja COA:t": "Documentation & COAs",
  "Kysymyksiä analyysitodistuksista.": "Questions about certificates of analysis.",
  "Menetelmät ja analytiikka": "Methods & analytics",
  "HPLC, massaspektrometria, NMR.": "HPLC, mass spectrometry, NMR.",
  "Säilytys ja käsittely": "Storage & handling",
  "Lyofiloitu säilytys, liuotus.": "Lyophilised storage, reconstitution.",
  "Markkinat ja sääntely": "Market & regulation",
  "Maakohtainen kelpoisuus.": "Country-specific eligibility.",
  "Off-topic lounge": "Off-topic lounge",
  "Mikä tahansa muu.": "Anything else.",

  // glossary
  "Kaikki lyhenteet, tekniikat ja termit joita sivustolla käytetään.":
    "Every abbreviation, technique and term used on the site.",
  "Hae termejä…": "Search terms…",
  "Ei vielä sanastotermejä.": "No glossary terms yet.",
  "← Kaikki termit": "← All terms",
  "Liittyvät termit": "Related terms",
  "Liittyvät tuotteet": "Related products",
  "Tunnetaan myös": "Also known as",
  "Termiä ei löytynyt": "Term not found",
  "Meillä ei ole vielä sanastomerkintää tälle termille.":
    "We don't have a glossary entry for this term yet.",
  Analyyttinen: "Analytical",
  Kemia: "Chemistry",
  Vaatimustenmukaisuus: "Compliance",
  Logistiikka: "Logistics",
  Tuote: "Product",
  Sääntely: "Regulatory",

  // documents
  "← Laboratoriotestit": "← Lab tests",
  "Avaa alkuperäinen": "Open original",
  Lataa: "Download",
  "Muut dokumentit tälle tuotteelle": "Other documents for this product",
  "Ei dokumentteja.": "No documents.",
  Dokumentit: "Documents",
  "Näytä kaikki dokumentit": "View all documents",

  // authors
  Rooli: "Role",
  "Tämän kirjoittajan artikkelit tulossa pian.": "Articles by this author coming soon.",
  "Kuratoituja tuotepaketteja tutkimukseesi. Tallenna yksityisesti tai jaa julkisesti.":
    "Curated product bundles for your research. Save privately or share publicly.",
  "Et ole vielä luonut tutkimussuunnitelmia.": "You haven't created any research plans yet.",
  "Nimetön suunnitelma": "Untitled plan",
  "{count, plural, =0 {Ei tuotteita} one {# tuote} other {# tuotetta}}":
    "{count, plural, =0 {No products} one {# product} other {# products}}",
  "Jaa julkisesti": "Make public",
  "Pidä yksityisenä": "Keep private",
  "Linkki kopioitu.": "Link copied.",
  "Jaa tämä suunnitelma": "Share this plan",
  "Kuka tahansa tällä linkillä näkee suunnitelman tuotteet. Vain luku — ei tiliä vaadita.":
    "Anyone with this link can see the plan's products. Read-only — no account required.",
  "Suunnitelman nimi": "Plan name",
  "Muistiinpanot (valinnainen)": "Notes (optional)",
  "Markdown tuettu. Näkyy jaettaessa.": "Markdown supported. Shown when shared.",
  "Tallenna muutokset": "Save changes",
  "Poista suunnitelma": "Delete plan",
  "Poistetaanko tämä suunnitelma? Toimintoa ei voi peruuttaa.":
    "Delete this plan? This action can't be undone.",
  "Suunnitelman tuotteet": "Plan products",
  "Lisää tuote": "Add product",
  "Lisää olemassa olevaan suunnitelmaan tai luo uusi.":
    "Add to an existing plan or create a new one.",
  "Luo uusi suunnitelma": "Create new plan",
  "Jäsenen jakama": "Shared by a member",
  "Jaettu {date}": "Shared {date}",
  "Näytä tuote": "View product",
  "Ei vielä tuotteita.": "No products yet.",
  Julkinen: "Public",
  Yksityinen: "Private",
  "{title} — jaettu tutkimussuunnitelma": "{title} — shared research plan",
  "Kuratoitu paketti AverianLabs-yhteisön jäseneltä.":
    "A curated bundle from an AverianLabs community member.",
  "Kirjaudu sisään tallentaaksesi": "Sign in to save",

  // activity
  "Mitä on tapahtunut": "What's been happening",
  "Ketjut, vastaukset ja jaetut tutkimussuunnitelmat yhteisöstä.":
    "Threads, replies, and shared research plans from the community.",
  "aloitti ketjun": "started a thread",
  "vastasi ketjuun": "replied to a thread",
  reagoi: "reacted",
  "julkaisi uuden erän": "released a new batch",
  "julkaisi tuotteen": "published a product",
  "julkaisi tutkimusmuistion:": "published a research note:",
  "jakoi tutkimussuunnitelman:": "shared a research plan:",
  "Ei vielä toimintaa — syöte täyttyy jäsenten postatessa.":
    "No activity yet — the feed fills up as members post.",
  "Näytä kaikki toiminta": "View all activity",

  // gdpr
  "Vie tietosi": "Export your data",
  "Lataa JSON-arkisto kaikesta mitä sinusta on — tilaukset, suunnitelmat, yhteisöviestit, tili.":
    "Download a JSON archive of everything we hold on you — orders, plans, community posts, account.",
  "Pyydä vientiä": "Request export",
  "Vienti pyydetty. Tarkista sähköpostisi.": "Export requested. Check your email.",
  "Poista tilisi": "Delete your account",
  "Poista tilisi ja kaikki siihen liittyvät tiedot pysyvästi. 30 päivän jälkeen toimintoa ei voi peruuttaa.":
    "Permanently delete your account and all data tied to it. After 30 days, the action cannot be undone.",
  "Poista tili": "Delete account",
  "Kirjoita DELETE vahvistaaksesi. 30 päivän jälkeen toimintoa ei voi peruuttaa.":
    "Type DELETE to confirm. After 30 days, the action cannot be undone.",

  // account
  "Tervetuloa takaisin": "Welcome back",
  "Tallennetut tutkimussuunnitelmat": "Saved research plans",
  "Yksityisyys ja tiedot": "Privacy & data",
  "Näytä suunnitelmat": "View plans",
  "Luo suunnitelma": "Create plan",
  "Et ole vielä luonut suunnitelmia.": "You haven't created any plans yet.",
  "Tilin poisto on vireillä. Se käsitellään 30 päivän kuluessa.":
    "Account deletion is pending. It will be processed within 30 days.",
  "Tietojen vienti on valmis. Tarkista sähköpostisi.": "Data export is ready. Check your email.",

  // notFound, cart drawer etc.
  Ostoskorisi: "Your cart",
  // Strings that were already English in the Finnish source
  "You will earn": "You will earn",
  "from this order": "from this order",
  Averia: "Averia",
  "viim. 24h": "events in last 24h",
  Ketjut: "Threads",
  "Yhteisön säännöt": "Community rules",
  DELETE: "DELETE",
}

function translate(value) {
  if (typeof value === "string") return dict[value] ?? `[[${value}]]`
  if (Array.isArray(value)) return value.map(translate)
  if (value && typeof value === "object") {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = translate(v)
    return out
  }
  return value
}

const en = translate(fi)

// Always add nav.search — Header calls useTranslations("nav")("search")
en.nav = { ...en.nav, search: "Search" }

writeFileSync(target, `${JSON.stringify(en, null, 2)}\n`)
console.log(`Restored ${target}`)
console.log(`Keys: ${Object.keys(en).length}, total leaves: ${JSON.stringify(en).length} chars`)

// Report any unmapped Finnish strings so they can be fixed manually.
const unmapped = []
function walk(node, path = "") {
  if (typeof node === "string") {
    if (node.startsWith("[[") && node.endsWith("]]")) unmapped.push(`${path} → ${node}`)
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`)
  }
}
walk(en)
if (unmapped.length) {
  console.log("\nUnmapped Finnish strings (need manual translation):")
  for (const u of unmapped) console.log(`  ${u}`)
} else {
  console.log("\nAll Finnish strings mapped.")
}
