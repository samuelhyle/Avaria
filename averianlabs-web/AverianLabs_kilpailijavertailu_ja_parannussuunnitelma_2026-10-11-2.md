# Averian Labs — kilpailijavertailu ja verkkokaupan parannussuunnitelma

**Päiväys:** 11.10.2026  
**Kohde:** [Averian Labsin demo](https://averianlabs-demo.netlify.app/fi)  
**Vertailukohde:** [Crystal Peptides Suomi](https://crystalpeptides.fi/)  
**Tavoite:** Suomen ensimmäiseen julkaisuun sopiva peptidiverkkokauppa, jonka tuotetiedot, eräraportit ja tilauspalvelu ovat johdonmukaisia. Tuotteet hankitaan käyttäjän mukaan Euroopasta. Myöhempi Euroopan laajennus huomioidaan rakenteessa.

## 1. Suositeltu päätös

Säilytetään Averian Labsin nykyinen sivustopohja ja keskitetään seuraava kehitysvaihe neljään kokonaisuuteen:

1. **Oikea ja yhtenäinen tuotetieto.** Tuote, pakkauskoko, yksikkö, hinta, sisältö ja myyntikelpoisuus määritellään samassa tietolähteessä.
2. **Todennettava erätieto.** Myynnissä oleva ja toimitettu erä kytketään sen todellisiin analyysiraportteihin.
3. **Sujuva Suomen ostopolku.** Toimituskulut, toimitusarvio, maksutapa ja tilauksen tila näkyvät selvästi.
4. **Viimeistelty suomenkielinen kokonaisuus.** Poistetaan julkaisemattomat lupaukset, tyhjät osiot ja keskeneräiset käännökset.

Averianin mahdollinen kilpailuetu on asiakkaan kyky tarkistaa tuote, erä, hinta ja toimitus helposti. Lisäominaisuuksien määrä ei vielä osoita parempaa asiakaskokemusta. Crystalilla on jo vahva julkinen analyysikirjasto, joten pelkkä COA-sivu tai QR-koodi ei yksin riitä erottamaan Averiania.[C2]

### Tarkastuksen kattavuus

Tarkastus kattoi demon pääsivut, tuotevalikoiman, BPC-157:n, Retatrutidin ja BAC-veden tuotesivut, testaus- ja dokumenttisivut, yritys- ja tukisivut, ehdot, tietosuojan, evästeet, tutkimusrajaukset, blogin ja yhden artikkelin, sanaston, laskurin, yhteisön, kumppaniohjelman, kanta-asiakasohjelman sekä tilin, vertailun ja toivelistan julkiset näkymät.

Arvio perustuu julkisiin sivusisältöihin ja selaimessa nähtyyn rakenteeseen. Demon ikävahvistusta ei kuitattu, joten varsinaista kassapolkua ei vahvistettu käyttötestillä. Maksutapahtumia, kirjautumisen jälkeisiä näkymiä, palvelinkoodia, todellista varastoa, laboratoriosopimuksia, mobiililaitteita tai Core Web Vitals -käyttäjämittauksia ei tarkastettu. Sivulla esitetty väite erotetaan tässä sen todennetusta toteutumisesta. Esimerkiksi puuttuva julkinen raportti ei todista, ettei analyysia olisi tehty.

## 2. Vertailu Crystal Peptidesiin

| Osa-alue | Averianin havaittu tilanne | Crystalin havaittu tilanne | Averianin kehitystavoite |
|---|---|---|---|
| Valikoiman löytäminen | Haku, suodattimet, variantit ja vertailu ovat mukana käyttöliittymässä. Käännöksiä puuttuu. | Selkeä kauppapolku ja laaja valikoima. | Hyvä suomenkielinen haku, näkyvät pakkauskoot ja ymmärrettävät tuoteryhmät. |
| Laatutodisteet | COA-taulukko on olemassa, mutta dokumenttisivu oli tyhjä. Erätuloksissa on ristiriitoja. | Haettava raporttikirjasto, laboratorion varmennuslinkkejä ja aiempien erien merkintöjä. | Yksi erätietue, avautuva alkuperäisraportti ja toimituksen eräsidonta. |
| Suomen toimitus | Toimitussivu esittää 1–2 päivän arvion, muualla esiintyy erilaisia 24 tunnin lupauksia. | Suomen etusivu ilmoittaa 7–9 työpäivää. | Varastoon ja kuljetussopimukseen perustuva täsmällinen toimitusarvio. |
| Ilmainen toimitus | Demossa yli 150 euroa. | Etusivulla yli 200 euroa. | Päätetään raja oman katteen ja toteutuneiden toimituskulujen perusteella. |
| Maksaminen | Useita maksupalvelulogoja; tuotantotoimivuutta ei varmennettu. | Suomen etusivu esittää tilisiirron ja krypton. | Näytetään vain kyseiselle tilaukselle hyväksytyt, toimivat vaihtoehdot. |
| Suomenkielisyys | FI-sivuille jää englanninkielisiä sivuja ja käännösavaimia. | Keskeinen Suomen asiointisisältö on suomeksi. | Koko ostopolku, tukitekstit, virhetilanteet ja vahvistukset valmiiksi suomeksi. |
| Sisältö ja lisätoiminnot | Paljon toimintoja, mutta osa sisällöstä on tyhjää tai lyhyttä demotekstiä. | Tutkimusartikkeleita, UKK ja palkinto-ohjelma. | Julkaistaan vain hyödylliset, ylläpidettävät kokonaisuudet. |

**Lähdepohja:** Averianin sivut [A1]–[A23]; Crystalin Suomen etusivu ja analyysikirjasto [C1]–[C2]. Toimitusajat ovat sivustojen lupauksia, eivät mitattuja toimitustuloksia. Suomen etusivun maksutapalista ei todista kilpailijan kaikkien maiden kassavalikoimaa.

## 3. Ensimmäiseksi korjattavat havainnot

Prioriteetit:

- **P0:** ratkaistaan ennen maksullisen tuotantomyynnin avaamista.
- **P1:** ensimmäisen viimeistellyn julkaisun käytettävyys ja sisältö.
- **P2:** myöhempi kehitys käytön ja asiakaspalautteen perusteella.

### 3.1 Tuote-, erä- ja hintatiedot

| ID | Taso | Todettu havainto | Korjaus | Hyväksymiskriteeri |
|---|---|---|---|---|
| DATA-01 | P0 | BPC-2026-07-A: tuotesivulla 99,2 %, COA-taulukossa 99,4 %. Myös Retatrutidin erän arvot eroavat. [A3], [A4], [A6] | Varmistetaan oikeat raportoidut arvot ja poistetaan käsin monistetut erätiedot. | Sama erä, sama menetelmä ja sama raporttiversio näyttävät saman tuloksen kaikilla sivuilla. |
| DATA-02 | P0 | BAC-veden pakkauskoon valinta ja muut komponentit esittävät 10 mg; laatikon sisällössä esiintyy 10 mL. [A5] | Tuotetyyppikohtaiset yksiköt ja komponentit. Todellinen tilavuus tarkistetaan tuotedokumentaatiosta. | Vesi, peptidimassa ja muut määrät käyttävät niille kuuluvaa yksikköä; komponentti ei pakota kaikkea mg-muotoon. |
| DATA-03 | P0 | COA-rekisterissä BAC-vedellä on 0 % HPLC ja hyväksytty tila. [A6] | Puuttuva tai soveltumaton arvo esitetään omana tilanaan. | Puuttuva tulos ei muutu nollaksi eikä soveltumaton testi hyväksytyksi mittaustulokseksi. |
| DATA-04 | P0 | Retatrutidin lisätuotepaketissa tarjouspyyntötuote AOD-9604 näkyy 0 euron hintaisena. [A4] | Erotetaan kiinteähintainen tuote ja tarjouspyyntötuote tietomallissa. | Hinnoittelematonta tuotetta ei voi sisällyttää maksettavaan pakettiin nollahinnalla; myös palvelin estää tämän. |
| DATA-05 | P0 | Sama yleinen pakkaussisältö on kopioitu myös BAC-vedelle. BPC-sivu lupaa mukana vettä ja tarjoaa sitä samalla lisäostona. [A3], [A5] | Määritellään toimitussisältö varianttikohtaisesti. | Tuotesivu, kori, vahvistus ja keräilylista kuvaavat samaa todellista sisältöä. |
| DATA-06 | P1 | Tuotekorteissa näkyy kaksinkertainen prosenttimerkki. Retatrutidin sekvenssikentässä on reseptoritoiminnan kuvaus. [A2], [A4] | Tarkistetaan kenttien merkitys ja paikallinen lukumuotoilu. | Puhtaus muotoillaan kerran; sekvenssi, vaikutuskuvaus, CAS ja molekyylikaava pysyvät omissa kentissään. |

Oikeaa puhtauslukua ei valita sen perusteella, kumpi näyttää paremmalta. Se vahvistetaan alkuperäisestä analyysista. Jos samasta erästä on eri menetelmillä tai eri aikaan saatuja tuloksia, ne erotetaan toisistaan.

BAC-veden endotoksiinituloksen EU/mg-yksikköä ei vaihdeta automaattisesti EU/mL-muotoon. Alkuperäisestä raportista tarkistetaan yksikkö ja se, mihin näytteen määrään tulos suhteutetaan.

### 3.2 Laatudokumentaatio ja julkaistavat lupaukset

| ID | Taso | Havainto | Toimenpide |
|---|---|---|---|
| QA-01 | P0 | Dokumenttikirjasto ilmoittaa, ettei dokumentteja ole. COA-taulukon riveistä ei löytynyt avattavia raporttilinkkejä. [A6], [A7] | Julkaistaan todelliset, erään sidotut raportit. COA-taulukon tulos ei korvaa alkuperäistä dokumenttia. |
| QA-02 | P0 | Sivusto esittää nimettyjä laboratorioita, GMP-verkostoa ja eräkohtaisia steriiliys-/mykoplasmatestejä. [A8], [A9] | Jokainen väite sidotaan dokumentoituun toimitukseen, toimipaikkaan, menetelmään ja testikattavuuteen. |
| QA-03 | P0 | Etusivun, yritysesittelyn, laatusivun ja toimitussivun toimituslupaukset eroavat. [A1], [A9], [A10], [A11] | Erotetaan varastolta lähettäminen ja asiakkaalle saapuminen. Yksi yhteinen toimituslupauksen tietolähde. |
| QA-04 | P0 | Yritysesittely esittää yli 2 400 varmennettua instituutiota ja toiminnan taustaa, jota tämä tarkastus ei vahvistanut. [A10] | Julkaistaan vain dokumentoidut asiakasluvut, kumppanit ja oma osaaminen. |
| QA-05 | P1 | Standardi-, menetelmä- ja kylmäketjukieli on osittain epätäsmällistä. [A8], [A9] | Laboratoriokumppani tarkistaa sanamuodot ennen julkaisua. Näytetään juuri se, mitä analyysi osoittaa. |

Laboratorion akkreditointi koskee sen pätevyysalueeseen kuuluvia menetelmiä. Siksi laboratorion nimi ja ISO/IEC 17025 -maininta yhdistetään oikeaan toimipaikkaan, akkreditointitunnukseen ja testin pätevyysalueeseen.[S2]

Kuljetusolosuhteiden kuvaus erotetaan tuotteen säilyvyydestä. Jos lähetyskohtainen lämpötilaloki luvataan, sen on synnyttävä kyseiselle lähetykselle ja oltava asiakkaan saatavilla. Pakastekuivausta ei käytetä yksin todistuksena toteutuneesta kylmäketjusta.

### 3.3 Suomenkielisyys, rakenne ja luottamus

| ID | Taso | Havainto | Toimenpide |
|---|---|---|---|
| UX-01 | P1 | FI-reitin laboratorio-, yritys-, toimitus-, ehto- ja palkintosivuilla on laajoja englanninkielisiä osia. [A8]–[A14], [A20] | Yhtenäinen suomenkielinen julkaisu ja koko käyttöliittymän kielitarkastus. |
| UX-02 | P1 | Kumppani- ja vertailusivulla näkyy käännösavaimia, esimerkiksi partner.submit ja compare.emptyTitle. [A19], [A21] | Puuttuvien käännösten tarkistus osaksi julkaisua. |
| UX-03 | P1 | Yhteisössä ei ole ketjuja ja sanastossa ei ole termejä. [A17], [A18] | Täydennetään hyödyllinen sisältö tai poistetaan osio julkaistusta navigaatiosta. |
| UX-04 | P1 | BPC-blogimerkintä näyttää 9 minuutin lukuajan, mutta sisältö on lyhyt eikä siinä ole avattavia tutkimuslähteitä. [A16] | Kirjoitetaan valmis, lähteistetty artikkeli ja lasketaan lukuaika todellisesta sisällöstä. |
| UX-05 | P1 | Ensivierailun aikana ikäportti, evästevalinta ja uutiskirjepopup voivat olla yhtä aikaa läsnä. [A17] | Yksi huomion vaativa käyttöliittymä kerrallaan. Uutiskirjeelle rauhallinen paikka sivulla. |
| UX-06 | P0 | Alatunnisteen yritystunnus ja osoite ovat paikkamerkkejä. [A1], [A12] | Viralliset yritys- ja yhteystiedot näkyviin ennen tilausta. |
| UX-07 | P1 | Yhteisön sivulla kuvataan moderoinnin sisäistä ohjelmistototeutusta. [A17] | Asiakkaalle kerrotaan keskustelun säännöt, ilmoittamiskeino ja tuen toiminta. Sisäinen toteutus jää ylläpitoon. |

## 4. Julkaisun asiakasmalli ja tuotekohtainen tarkistus

Demon ehdot kuvaavat päteville tutkijoille ja instituutioille tarkoitettua kauppaa. Julkinen laskuri puolestaan sisältää annos- ja titrausaikatauluja sekä ruiskukuvauksen.[A13], [A23] Tämä pitää ratkaista liiketoiminnan ja sivuston todellisen käyttötarkoituksen tasolla.

Fimea arvioi luokitusta valmistekohtaisesti koostumuksen, käyttötarkoituksen ja muiden ominaispiirteiden perusteella. Tästä seuraava toteutuspäätös on, ettei tutkimuskäyttömerkintää, eurooppalaista toimittajaa tai 18 vuoden ikärajaa käsitellä yksin myyntioikeuden osoituksena.[S1]

**Ensimmäisen julkaisun päätöslomake jokaiselle tuotteelle:**

- Täsmällinen valmiste, valmistaja ja toimitettava muoto.
- Toimittajan sijainti, valmistusmaa ja lähetysmaa erillisinä tietoina.
- Suomen myyntiin soveltuva luokitusperuste ja tarvittavat oikeudet.
- Hyväksytty asiakasryhmä ja sen mukainen ostajaprosessi.
- Tuotteen sallittu esittelytapa ja dokumentoidut ominaisuudet.
- Maksupalvelun kirjallinen soveltuvuusarvio valikoimalle ja myyntimallille.
- Tuotteen julkaisutila: luonnos, selvityksessä, hyväksytty tai suljettu.

Aidossa tutkimusorganisaatioiden kaupassa ostopolkuun voidaan tarvita organisaation ja tutkimuskäytön tarkistus. Jos myydään kuluttajille sallittuja tuotteita, kuluttajapolku ja kuluttajaehdot toteutetaan erikseen. B2B-merkintä ei itsessään ratkaise tuotteen luokitusta.

**Laskuri:** jätetään nykyinen annoskalenteri ja tuotesidonnaiset annosesiasetukset pois ensimmäisestä julkisesta julkaisusta. Mahdollinen myöhempi laboratoriotyökalu rajataan dokumentoituun pitoisuus- ja laimennuslaskentaan ilman ihmisannosten, annosteluvälien tai hoito-ohjelmien suosittelua. Säilyvyysarviot tarvitsevat tuotekohtaisen lähteen.

## 5. Tuote- ja erätiedon suositeltu rakenne

Tämä on toteutussuositus, ei kuvaus nykyisestä lähdekoodista.

| Tietue | Sisältö | Miksi tarvitaan |
|---|---|---|
| Tuote | Nimi, tuotetyyppi, tarkistettu kemiallinen identiteetti, tutkimuskäyttö ja dokumentaatio | Yksi aine ei saa esiintyä eri sivuilla eri määritelmin. |
| Pakkausvariantti | Tuotetunnus, määrä, yksikkö, todellinen toimitussisältö ja hinnoittelutapa | Estää mg/mL-virheet sekä väärän koko- ja hintaparin. |
| Varastoerä | Toimittajan ja oman erän tunnukset, saapuminen, säilytys, saatavuus ja hyväksyntätila | Mahdollistaa oikean erän varauksen ja keräilyn. |
| Analyysiraportti | Näyte, laboratorio, menetelmä, päivä, tulos, yksikkö, alkuperäisraportti ja versio | Asiakas näkee, mitä on todella tutkittu. |
| Tilausrivi | Tilattu variantti, sovittu hinta, sisältö ja toimitukseen sidottu erä | Historiallinen tilaus ei vaihda todistusta myöhemmän tuote-erän mukana. |
| Lähetys | Pakattu määrä, erä, seuranta ja soveltuvat kuljetustiedot | Tilaus voidaan yhdistää todelliseen pakkaukseen. |

Sama raaka-aine-erä voi päätyä useisiin pakkauskokoihin. Raportin yhteydessä kerrotaan, tutkittiinko raaka-ainetta, valmista pulloa vai muuta näytettä. Yhden näytteen määrätulosta ei esitetä automaattisesti kaikkien pakkauskokojen tuloksena.

### Eräsivun sisältö

1. Tuote, pakkauskoko ja yksiselitteinen erätunnus.
2. Testattu näyte ja sen suhde toimitettavaan tuotteeseen.
3. Laboratorio, raportin tunnus ja testauspäivä.
4. Testikohtaiset tulokset ja täsmälliset yksiköt.
5. Alkuperäinen raportti ja mahdollinen laboratorion aitouslinkki.
6. Testit, joista raporttia ei ole, selvästi nimettyinä.
7. Julkaisun ja mahdollisten korjausten versiohistoria.

**Testin näyttötilat:** raportoitu tulos, raporttia ei saatavilla, ei tutkittu tai ei sovellu. Pelkkää vihreää hyväksyntämerkkiä ei näytetä kaikkien testien korvikkeena.

Pakkauksen QR avaa julkisen eräsivun. Siinä ei ole asiakkaan henkilötietoja. Tilausvahvistuksessa ja suojatulla tilaussivulla säilyy toimitetun erän viite.

Jos erä luvataan asiakkaalle ennen maksamista, myös varauksen on oltava todellinen. Erää ei vaihdeta hiljaisesti. Vaihtoehtoisesti mahdolliset erät ja vahvistuksen ajankohta kerrotaan etukäteen.

## 6. Sivukohtainen käyttökokemus

### 6.1 Etusivu

Säilytetään oma tunnus, vaalea laboratorioilme ja hillitty sininen tehosteväri. Ensimmäinen näkymä kertoo, mitä myydään, kenelle, mistä raportit löytyvät ja miten toimitus Suomeen toimii.

Suositeltu osiojärjestys:

1. **Pääviesti ja kaksi toimintoa:** valikoima sekä eräraportit.
2. **Kolme dokumentoitua perustetta:** jäljitettävyys, tarkistettavat analyysit ja selkeä toimitus.
3. **Pieni valikoimanosto:** 4–6 julkaisuun hyväksyttyä tuotetta.
4. **Näin erä tarkistetaan:** konkreettinen esimerkki todellisesta raportista.
5. **Toimitus ja asiakaspalvelu Suomessa.**
6. **Yritys ja toiminnan vastuuhenkilöt.**
7. **Tiivis UKK ja uutiskirjetilaus.**

Etusivun ensisijainen tavoite on johdattaa asiakkaan tarvitsemaan tuotteeseen ja sen dokumentaatioon. 3D-näkymä voi jäädä valinnaiseksi tuotesivun lisätoiminnoksi. Automaattisesti vaihtuvaa karusellia ei tarvita koko ostamisen perustaksi.

### 6.2 Navigaatio

Ensimmäisen julkaisun päävalikko:

- Tuotteet
- Eräraportit
- Laatu ja jäljitettävyys
- Toimitus ja UKK
- Yritys ja yhteystiedot

Haku ja ostoskori näkyvät selvästi. Yritysasiakkaiden hakemus lisätään, jos se kuuluu valittuun asiakasmalliin. Tutkimusartikkelit pidetään omana sisältökokonaisuutenaan, kun niiden toimituksellinen laatu on valmis.

### 6.3 Tuoteluettelo

Tuotekortti näyttää nimen, pakkauskoon, oikean yksikön, hinnan ja saatavuuden. Useamman koon tuotteessa hinnan yhteydessä näytetään, mitä kokoa lähtöhinta tarkoittaa. Raporttiin pääsee suoraan.

Suodattimien tarkoitus on auttaa löytämään tuote. Suomeksi nimetyt tuoteryhmät, pakkauskoko ja saatavuus riittävät alkuun. Puhtauslajittelu ei saa esittää eri menetelmien tai näytetyyppien lukuja suoraan laatuparemmuutena.

Haku tunnistaa suomen- ja englanninkielisen nimen, yleiset kirjoitusasut, CAS-tunnuksen ja tuotetunnuksen. Nollatuloksessa tarjotaan ymmärrettävä jatkotoimi.

### 6.4 Tuotesivu

Ostopäätöksen kannalta tärkeä sisältö sijoitetaan sivun alkuun:

- Tuote ja tarkka pakkauskoko.
- Hinta veroineen sekä toimituskulu tai linkki selkeään toimituslaskentaan.
- Todellinen saatavuus, lähetysajankohta ja toimitusarvio.
- Myynnissä oleva erä ja linkki sen raportteihin.
- Toimitussisältö.
- Määrän valinta ja selkeä pääpainike.

Alempana ovat tekniset tiedot, säilytys- ja käsittelytiedot lähteineen, testikattavuus, tarvittavat turvallisuusasiakirjat, tutkimusviitteet ja lyhyt UKK.

Tuotekuvan etiketti, varianttivalinta, hinta ja pakkaussisältö vaihtuvat yhdessä. Yleinen mallikuva merkitään sellaiseksi, jos se ei vastaa toimitettavan erän etikettiä.

Pidetään yksi selkeä ostotoiminto. Automaattiset uusintatilaukset, useat lisätuotepaketit ja suuri tekoälyneuvojan painike siirretään myöhempään vaiheeseen.

### 6.5 Mobiili

Nämä ovat hyväksymistavoitteita, eivät tämän auditoinnin mittaustuloksia:

- Tarkastus 360–430 pikselin näkymissä sekä iOS Safarissa ja Android Chromessa.
- Tuotteen koko, hinta, eräraportti ja ostotoiminto löytyvät ilman tarpeetonta selaamista.
- Kosketuskohteille tavoitellaan noin 44–48 pikselin kokoa.
- Tuote- ja erätaulukot toimivat kapealla näytöllä.
- Kiinteä ostorivi ei peitä lomaketta, evästevalintaa tai muuta tärkeää toimintoa.
- Näppäimistö ei peitä aktiivista kenttää tai virheilmoitusta.
- Yksi modaali kerrallaan ja toimiva näppäimistöfokus.
- Liikkeen vähentämisen asetus huomioidaan.
- Maksupalvelusta paluu säilyttää tilauksen ja näyttää oikean maksutilan.

## 7. Hinnoittelu: vertailkaa samaa kokoa

Tarkastushetken listahinnat. Averianin luvut ovat demon esityksiä.

| Nimellisesti vastaava pakkaus | Averianin demo | Crystalin Suomen sivu | Ero Crystalin hintaan |
|---|---:|---:|---:|
| BPC-157, 10 mg | 69,00 € | 47,95 € | +43,9 % |
| Retatrutide, 20 mg | 99,00 € | 159,99 € | −38,1 % |

Hintaero on laskettu kaavalla Averianin hinta / Crystalin hinta − 1. Lähteet: [A3], [A4], [C1], [C3]. Vertailussa ei ole toimituskuluja, alennusyhdistelmiä tai varmennettua eroa toimitussisällössä ja testikattavuudessa. Se ei osoita tuotteiden laatua tai ostamisen kokonaishintaa.

BPC-157:n 5 mg:n lähtöhintaa ei verrata kilpailijan 10 mg:n hintaan. Hintastrategia päätetään tuotekohtaisesti hankintahinnan, analyysien, pakkaamisen, logistiikan, maksukulujen, palautusten ja katetavoitteen perusteella.

Määritellään myös alennusten yhdistämissäännöt: paketti, määräalennus, kampanja, kanta-asiakasetu ja mahdollinen uusintatilaus eivät saa kasautua vahingossa. Ilmaisen toimituksen raja lasketaan samalla tavalla sivustolla ja kassalla.

## 8. Maksaminen, kuitti ja yhteydenotto

Aiemman kuitti–viestikanava–kryptomaksuajatuksen sopiva toteutus on seuraava:

1. Kauppa muodostaa yksilöidyn tilauksen ja tarkistetun loppusumman.
2. Asiakas saa maksupyynnön valitulla hyväksytyllä maksutavalla.
3. Maksu varmistetaan palvelimella.
4. Asiakas saa asianmukaisen vahvistuksen ja maksukuitin.
5. Tilaus etenee keräilyyn ja toimitukseen.
6. Suojattu tilaussivu näyttää tilan ja tarjoaa yhteydenoton.

**Tilaustilat:** odottaa maksua, maksu tarkistuksessa, maksettu, keräilyssä, lähetetty, peruutettu tai palautettu. Vanhentuneet ja osittaiset maksut käsitellään erikseen.

Asiakkaan viesti tai maksukuvakaappaus ei muuta tilaa maksetuksi. Maksupalvelun toistuva ilmoitus ei saa luoda toista tilausta tai toimitusta.

Maksuilmoituksen aitous varmennetaan. Palvelin vertaa tilaustunnusta, maksun vastaanottajaa tai kauppiastiliä, summaa, valuuttaa ja lopullista maksutilaa tilaukselle tallennettuihin tietoihin. Väärennetty ilmoitus tai toisen tilauksen maksu ei vahvista tilausta. Kryptomaksussa tarkistetaan lisäksi oikea verkko ja tarvittaessa token.

### Maksupalvelun valinta

Stripe arvioi liiketoiminnan tilikohtaisesti. Rajoitetun toiminnan hyväksyntä voi edellyttää lisäselvityksiä ja nimenomaista hyväksyntää; demossa näkyvä logo ei osoita Averianin hyväksyntää.[S3] Julkaistavan valikoiman ja ostajamallin hyväksyntä selvitetään ennen maksupalvelulogojen ja tuotantomaksujen käyttöönottoa.

Ensimmäiseen versioon integroidaan rajattu määrä hyväksyttyjä maksutapoja. Asiakas näkee vain juuri hänen tilaukselleen tarjolla olevat vaihtoehdot.

### Mahdollinen kryptomaksu

Maksupyynnössä erotetaan valuutta, verkko, vastaanotto-osoite, summa, voimassaolo ja vahvistustila. Ali-, yli-, myöhäis- ja väärän verkon maksuille on asiakaspalveluprosessi. Kylmälompakon siemenlausetta tai yksityisiä avaimia ei sijoiteta verkkokauppapalvelimelle. Varojen käsittely ja palautukset erotetaan tavallisesta tilausten ylläpidosta.

### Viestikanava

Suositus on yksi ensisijainen viestikanava ja sähköposti. WhatsApp-, Signal- tai Telegram-linkki voi sisältää satunnaisen tukiviitteen. Siihen ei laiteta toimitusosoitetta, ostoslistaa tai koko tilauksen avaavaa salaisuutta.

Tilausvahvistus, kuitti ja tilaustiedot säilyvät kaupan omassa prosessissa. Asiakasta ei velvoiteta siirtämään koko tilausta erilliseen keskustelusovellukseen saadakseen tietää, mitä maksaa ja mitä hänelle toimitetaan.

## 9. Suomen toimituslupaus

Suositeltu esitystapa erottaa kolme asiaa:

| Asiakkaan kysymys | Näytettävä tieto |
|---|---|
| Mistä tuote lähtee? | Todellinen lähetysmaa ja varasto. |
| Milloin paketti lähtee? | Maksun vahvistukseen, varastoon, viikonpäivään ja katkoaikaan perustuva arvio. |
| Milloin paketti saapuu? | Kuljetustavan ja postinumeroalueen toimitusarvio. |

Suomen ensimmäisessä julkaisussa kassalla tarjotaan vain oikeasti avatut toimitusalueet ja reitit. Ahvenanmaan käsittely ratkaistaan erikseen ennen sen avaamista. EU:n ulkopuolisia reittejä ei näytetä automaattisesti pelkän valmiin käännöspohjan vuoksi.

Demoissa esiintyvä 24 tunnin EU-toimitus korvataan täsmällisellä lähetys- tai saapumisilmaisulla. Jos 1–2 arkipäivän toimitus Suomessa ei ole sopimuksilla ja koetoimituksilla varmistettu, sitä käsitellään kehitystavoitteena.

Näkyviin tulevat myös seuranta, mahdolliset lämpötilavaatimukset, poikkeustilanteen käsittely ja reklamointikanava. Kesäaika huomioidaan aikarajoissa: asiakkaalle ymmärrettävä ilmaus on Suomen aika.

## 10. Yritystiedot, ehdot ja tietosuoja

Ennen tilausta esitetään oikeat yritys- ja yhteystiedot, kokonaishinta sekä toimitus- ja maksutiedot. Kuluttajapolun viimeinen tilaustoiminto ilmaisee maksuvelvollisuuden, ja vahvistus toimitetaan pysyvästi.[S4]

Demon kuljetusriskin siirto ostajalle ensimmäisessä kuljettajaskannauksessa korjataan kuluttajaehdoista. Tavallisessa myyjän järjestämässä kuljetuksessa myyjä vastaa sopimuksen mukaisesta toimittamisesta kuluttajalle.[S5]

**Vuoden 2026 vaatimus:** verkossa tehtävän kuluttajasopimuksen peruuttamistoiminto on tarjottava 19.6.2026 alkaen, kun asiakkaalla on peruuttamisoikeus. Se sijoitetaan helposti löydettäväksi, ja vastaanotetusta peruutuksesta lähetetään pysyvä vahvistus.[S4]

Toteutustehtävät:

- Korvataan paikkamerkit yrityksen vahvistetuilla tiedoilla.
- Valmistellaan valittua asiakasmallia vastaavat ehdot.
- Tarkistetaan palautuspoikkeusten soveltuvuus tuotteittain.
- Tarkistetaan verokäsittely toimitusmaan ja liiketoimen perusteella; VAT-tunnus ei toimi yleisenä verottomuuskytkimenä.
- Päivitetään tietosuojan palveluntarjoajat, tietojen sijainnit ja säilytysajat vastaamaan oikeaa toteutusta.
- Tarkistetaan ristiriita, jossa evästesivu mainitsee analytiikkapalvelun, jota tietosuojaselosteen luettelo ei sisällä.[A14], [A15]
- Toteutetaan toimiva suostumuksen muuttaminen ja testataan sitä vastaava analytiikan käyttäytyminen.
- Julkaistaan suomenkieliset tilausta ja ongelmatilanteita koskevat asiakirjat.

Tämä auditointi ei vahvista demossa lueteltujen palveluiden, EU-tietosijaintien tai maksuliitäntöjen toteutumista. Niitä ei päätellä selostetekstistä.

## 11. Sisältö, tutkimus ja tekoäly

Ensimmäiset valmiit tutkimussisällöt kannattaa valita asiakkaan todellisten tiedontarpeiden perusteella:

1. Analyysitodistuksen lukeminen.
2. Puhtaus, tunnistus ja määrä erillisinä tuloksina.
3. Erätunnuksen ja toimitetun pakkauksen yhdistäminen.
4. Dokumentoitu säilytys ja kuljetusolosuhteet.
5. Tilauksen, maksun ja toimituksen eteneminen.

Jokaisella tutkimusartikkelilla on kirjoittaja tai tarkistaja, tarkistuspäivä ja väitteeseen liittyvä alkuperäislähde. Esikliininen näyttö ja kliininen tutkimus erotetaan toisistaan. Artikkeli ei siirrä tutkimuksessa käytetyn valmisteen ominaisuuksia automaattisesti kaupan pulloon.

Mahdollisen Averia-avustajan ensivaiheen tehtävä on auttaa löytämään julkaistu tuoteasiakirja, tulkitsemaan dokumentin kenttiä ja selvittämään kaupan toimituskäytäntö. Vastauksen lähde näytetään. Jos asiaa ei voi vahvistaa hyväksytystä aineistosta, avustaja ohjaa asiakaspalveluun.

Tuotesidonnaisia ihmisannoksia, annostelukalentereita tai hoitosuosituksia ei aseteta avustajan myyntitoiminnoksi. Yhteisö avataan vasta, kun sille on sisältö, vastuullinen ylläpitäjä ja toimiva moderointiprosessi.

## 12. Hosting ja tekninen toteutus

**Suositus:** Netlify säilyy lähtökohtana. Oma verkkotunnus on mahdollinen Netlifyssä; netlify.app-osoite ei itsessään kerro, onko kaupan taustajärjestelmä valmis.[S6]

Seuraavaksi tarvitaan nykyisen lähdekoodin ja integraatioiden tarkastus:

- Mistä tuotteet, variantit, erät ja hinnat tulevat?
- Onko kassa oikea vai esittelytoiminto?
- Mikä palvelu vahvistaa maksun?
- Miten saldo varataan ja palautetaan?
- Missä tilaukset ja asiakastiedot säilytetään?
- Miten ylläpitäjät tunnistetaan ja käyttöoikeudet rajataan?
- Miten varmuuskopio palautetaan?

Alustaa vaihdetaan vasta, jos löytyvä vaatimus sitä perustelee. Tällaisia syitä voivat olla tarvittavat taustaprosessit, ylläpitomalli, tietojen sijainti tai mitattu kustannus-/suorituskykyongelma. Julkinen demo ei riitä valitsemaan korvaavaa hostingia tai arvioimaan siirron laajuutta.

### Tekninen toteutuslista

- Oma tuotantoverkkotunnus ja erillinen testiympäristö.
- Tuotannon ja testin erilliset maksutunnukset ja tiedot.
- Tuotesivujen yksilölliset otsikot, metatiedot ja indeksoitava sisältö.
- Julkaisemattomien kieliversioiden piilotus; valmiille kielille oikeat kieliviitteet.
- Tuotteen saatavuuteen ja hintaan sopiva rakenteinen tieto.
- Palvelin tarkistaa tuotteen, ostajan kelpoisuuden, hinnan, valuutan ja saldon.
- Asiakas pääsee vain omiin tilauksiinsa.
- Ylläpidolle monivaiheinen tunnistautuminen ja roolikohtaiset oikeudet.
- Lokit ilman maksusalaisuuksia tai tarpeettomia henkilötietoja.
- Palautettavat julkaisut, hälytykset ja kokeiltu varmuuskopion palautus.

Tietosuojasivun mainitsemaa teknologiavalikoimaa ei käsitellä vahvistettuna järjestelmäarkkitehtuurina.

## 13. Suorituskyky ja hakukonenäkyvyys

Web.dev:n hyvän käyttäjäkokemuksen tavoiterajat ovat LCP enintään 2,5 s, INP enintään 200 ms ja CLS enintään 0,1. Tavoitetta arvioidaan 75. persentiilissä erikseen mobiilissa ja työpöydällä.[S7] Nämä eivät ole demon mitattuja arvoja.

Ensimmäiset käytännön tehtävät:

- Pääkuvan tarkoituksenmukainen koko ja latausprioriteetti.
- Tuotekuvien ja muiden elementtien varattu tila.
- 3D-lataus vasta käyttäjän pyynnöstä.
- Uutiskirje- ja chat-lisäosien vaikutuksen mittaus.
- Toimivat tyhjä-, lataus- ja virhetilat.
- Tuote- ja artikkelikohtaiset sivuotsikot.
- Oikea kanoninen osoite, sivukartta ja kieliversioiden suhteet.
- Suomenkieliset hakutermit, jotka vastaavat todellista tutkimustuotetta.
- Ei julkaisemattomia demoväitteitä hakukoneen esikatseluteksteihin.
- Mittaus tuotantokäyttäjistä yksityisyyden ja suostumusmallin mukaisesti.

## 14. Rajaus ensimmäiseen julkaisuun

| Julkaisuun | Myöhempään kehitykseen |
|---|---|
| Hyväksytty tuotevalikoima ja oikeat tuotetiedot | Laaja valikoiman kasvattaminen |
| Todelliset eräraportit | Laajat raportointityökalut |
| Selkeä suomenkielinen kauppa | Saksa, hollanti ja muut uudet markkinat |
| Toimiva kassa ja maksujen täsmäytys | Useita rinnakkaisia maksupalveluita |
| Tilausvahvistus ja seuranta | Monimutkainen tilausten analytiikka |
| Suomen toimitukset ja asiakaspalvelu | Laaja kansainvälinen logistiikka |
| Valittuun ostajamalliin tarvittava kelpoisuustarkistus | Laaja kumppani- ja jälleenmyyntiohjelma |
| Käyttökelpoiset ehdot ja tietosuoja | Pisteet, suosittelupalkkiot ja monitasoiset edut |
| Muutama valmis lähteistetty sisältö | Julkinen yhteisö ja jatkuva sisältösyöte |
| Tavalliset tuotekuvat | Automaattiset 3D-karusellit |
| Asiakaspalvelun perustoiminnot | Laaja tekoälyneuvoja ja julkiset protokollat |
| Kertatilaus | Erän varaamiseen sidotut toistuvaistilaukset |

Koodia ei tarvitse poistaa vain siksi, ettei ominaisuutta julkaista. Ominaisuudet voidaan pitää erillisessä kehitysvaiheessa, jotta ensimmäinen kauppa on ylläpidettävissä.

## 15. Toteutuksen työjärjestys

Neljän viikon runko on suunnittelutavoite, ei vahvistettu julkaisu- tai työmäärälupaus. Se edellyttää käyttökelpoista lähdekoodia ja sitä, että kaupalliset sekä tuotekohtaiset edellytykset valmistuvat ajoissa. Uuden tilausjärjestelmän rakentaminen tai ulkopuolinen käsittely voi pidentää aikataulua.

| Vaihe | Työ | Vastuu | Valmistumisen näyttö |
|---|---|---|---|
| 1 / viikko 1 | Tuote- ja asiakasmallin päätökset, väitteiden inventaario, hintojen ja yksiköiden korjaukset, keskeneräisten ominaisuuksien rajaus | Omistaja, tuote-/laatuvastaava, kehittäjä | Hyväksytty julkaisuluettelo ja korjatut P0-tietovirheet |
| 2 / viikko 2 | Tuote-, variantti- ja erätietolähde, raporttikirjasto, tuotesivut, suomenkielisyys | Kehittäjä, laatuvastaava, sisällön tarkistaja | Tuote–erä–raportti-yhteys toimii ja oikeat tiedot näkyvät kaikilla sivuilla |
| 3 / viikko 3 | Kassa, maksuvahvistus, tilausviestit, keräily/eräsidonta, toimitusseuranta | Kehittäjä, maksupalvelu, operatiivinen vastuuhenkilö | Testiympäristössä onnistunut ja epäonnistunut tilauspolku |
| 4 / viikko 4 | Mobiili, saavutettavuus, suostumukset, oikeudet, palautukset, varmuuskopio ja koetoimitus | Kehittäjä, tarkistaja, operatiivinen vastuuhenkilö | Hyväksymistestit, dokumentoitu korjauslista ja julkaisuvalmiuden päätös |

### Ensimmäiset kymmenen konkreettista tehtävää

- [ ] DATA-01: eräkohtaiset puhtausluvut yhtenäisiksi alkuperäisraporteista.
- [ ] QA-01: aidot avattavat dokumentit ja erätunnuksen yhteys.
- [ ] DATA-02: BAC-veden yksikkö ja tuotetyyppi kuntoon.
- [ ] DATA-04: tarjouspyyntötuote pois nollahintaisesta lisäpaketista.
- [ ] DATA-05: toimitussisällöt varianttikohtaisiksi.
- [ ] UX-06: todelliset yritystiedot.
- [ ] QA-03: yksi Suomen lähetys- ja toimituslupaus.
- [ ] UX-01/02: suomenkieliset sivut ja puuttuvat käännökset.
- [ ] Ostoprosessi: tuotevalikoiman, asiakasmallin ja maksupalvelun yhteensopivuus.
- [ ] Julkaisurajaus: tyhjät yhteisö-/sanasto-osiot, nykyinen annoskalenteri ja keskeneräiset lisäominaisuudet erilliseen kehitysvaiheeseen.

## 16. Hyväksymistestit ennen julkaisua

| Testi | Hyväksytty tulos |
|---|---|
| Variantin vaihto | Pakkauskoko, yksikkö, hinta, kuva ja toimitussisältö vastaavat toisiaan. |
| Erän vaihtuminen | Uuden erän tuotesivu päivittyy; vanhan tilauksen raportti säilyy oikeana. |
| Puuttuva dokumentti | Käyttöliittymä näyttää totuudenmukaisen tilan ja myyntirajoitus toimii sovitun säännön mukaan. |
| Tarjouspyyntötuote | Ei automaattista nollahintaa korissa, paketissa tai maksupyynnössä. |
| Viimeinen kappale | Kaksi samanaikaista tilausta eivät myy samaa saldoa kahdesti. |
| Keskeytynyt maksu | Asiakas näkee oikean tilan, eikä tilausta lähetetä maksettuna. |
| Toistuva maksuilmoitus | Yksi maksu johtaa yhteen käsittelyyn ja toimitukseen. |
| Väärennetty tai väärään tilaukseen liittyvä maksuilmoitus | Aitouden ja tilaustietojen tarkistus estää virheellisen maksuvahvistuksen. |
| Myöhäinen/osittainen maksu | Sovittu tarkistusprosessi käynnistyy ja asiakas saa ymmärrettävän ohjeen. |
| Paluu maksupalvelusta | Asiakkaalle näytetään palvelimelta vahvistettu tila. |
| Tilauksen omistajuus | Toisen asiakkaan tilausta ei saa auki tilausnumeroa muuttamalla. |
| Erän keräily | Vahvistettu tilausrivi, pakattu tuote ja QR:n erä ovat samat. |
| Suomen toimitus | Hinta, katkoaika ja arvio ovat yhtenäiset tuotesivulla, kassalla ja vahvistuksessa. |
| Peruutus ja reklamaatio | Soveltuva toiminto löytyy ja vahvistus saapuu. |
| Evästevalinnan hylkäys | Ei-välttämättömien palveluiden toiminta vastaa annettua valintaa. |
| Suomenkielisyys | Ostopolussa ei näy käännösavaimia tai tahattomia englanninkielisiä virhetekstejä. |
| Mobiili ja näppäimistö | Keskeiset toiminnot ovat käytettävissä ilman peittyviä kenttiä tai fokuslukkoja. |
| Palautuminen | Varmuuskopio ja aikaisempi julkaisu voidaan palauttaa käytännössä. |

Tämä on tulevan toteutuksen hyväksymislista. Auditoinnissa ei väitetä näiden testien jo läpäisseen.

## 17. Julkaisun jälkeiset mittarit

Ensimmäinen mittausjakso keskittyy seuraaviin kysymyksiin:

- Löytääkö asiakas tuotteen haulla?
- Avaako hän tarvitsemansa eräraportin?
- Missä vaiheessa ostopolku keskeytyy?
- Kuinka moni hyväksytysti aloitettu maksu valmistuu?
- Toteutuuko annettu lähetys- ja toimituslupaus?
- Kuinka paljon kysymyksiä tulee maksun tilasta, toimituksesta ja COA:sta?
- Vastaako pakatun tuotteen erä tilaukselle tallennettua tietoa?
- Mikä on palautusten, toimituspoikkeamien ja korjattujen tietovirheiden määrä?

Ensimmäisten viikkojen data muodostaa oman lähtötason. Kasvuprosentteja, konversiota tai säästöjä ei luvata ilman sitä. Uusi ominaisuus otetaan työhön, kun sillä on yhteys havaittuun asiakasongelmaan.

## 18. Lähteet ja tarkastuspolut

### Averian Labs: selaimessa tarkastetut julkiset sivut

[A1]: https://averianlabs-demo.netlify.app/fi
[A2]: https://averianlabs-demo.netlify.app/fi/shop
[A3]: https://averianlabs-demo.netlify.app/fi/shop/bpc-157
[A4]: https://averianlabs-demo.netlify.app/fi/shop/retatrutide
[A5]: https://averianlabs-demo.netlify.app/fi/shop/bac-water
[A6]: https://averianlabs-demo.netlify.app/fi/coa
[A7]: https://averianlabs-demo.netlify.app/fi/documents
[A8]: https://averianlabs-demo.netlify.app/fi/lab-tests
[A9]: https://averianlabs-demo.netlify.app/fi/quality
[A10]: https://averianlabs-demo.netlify.app/fi/about
[A11]: https://averianlabs-demo.netlify.app/fi/support/shipping-returns
[A12]: https://averianlabs-demo.netlify.app/fi/contact
[A13]: https://averianlabs-demo.netlify.app/fi/legal/terms
[A14]: https://averianlabs-demo.netlify.app/fi/legal/privacy
[A15]: https://averianlabs-demo.netlify.app/fi/legal/cookies
[A16]: https://averianlabs-demo.netlify.app/fi/blog/bpc-157-overview
[A17]: https://averianlabs-demo.netlify.app/fi/community
[A18]: https://averianlabs-demo.netlify.app/fi/glossary
[A19]: https://averianlabs-demo.netlify.app/fi/partner
[A20]: https://averianlabs-demo.netlify.app/fi/rewards
[A21]: https://averianlabs-demo.netlify.app/fi/compare
[A22]: https://averianlabs-demo.netlify.app/fi/wishlist
[A23]: https://averianlabs-demo.netlify.app/fi/peptide-calculator

| Viite | Sivu |
|---|---|
| [A1] | Etusivu |
| [A2] | Tuotevalikoima |
| [A3] | BPC-157 |
| [A4] | Retatrutidi |
| [A5] | BAC-vesi |
| [A6] | COA-rekisteri |
| [A7] | Dokumentit |
| [A8] | Laboratoriotestaus |
| [A9] | Laatu |
| [A10] | Yritysesittely |
| [A11] | Toimitus ja palautukset |
| [A12] | Yhteystiedot |
| [A13] | Ehdot |
| [A14] | Tietosuoja |
| [A15] | Evästeet |
| [A16] | BPC-157-artikkeli |
| [A17] | Yhteisö |
| [A18] | Sanasto |
| [A19] | Kumppanit |
| [A20] | Kanta-asiakasohjelma |
| [A21] | Vertailu |
| [A22] | Toivelista |
| [A23] | Laskuri |

Lisäksi tarkastettiin [blogin etusivu](https://averianlabs-demo.netlify.app/fi/blog), [UKK](https://averianlabs-demo.netlify.app/fi/faq), [tilin julkinen näkymä](https://averianlabs-demo.netlify.app/fi/account) ja [tutkimuskäytön rajaus](https://averianlabs-demo.netlify.app/fi/legal/research-disclaimer).

### Kilpailija

[C1]: https://crystalpeptides.fi/
[C2]: https://crystalpeptides.fi/coa
[C3]: https://crystalpeptides.fi/product/retatrutide-20mg

- [C1] Suomen etusivu: hinnat, toimitus- ja maksutapaviestit. Tarkastettu selaimessa 11.10.2026.
- [C2] Analyysikirjasto: raporttiluettelo, haku ja laboratorion varmennuslinkit. Verkkohaku palautti tarkastushetken sisältöä.
- [C3] Retatrutide 20 mg:n tuotesivu; hinnan vertailussa käytettiin myös saman päivän Suomen etusivua.

Kilpailijan sivuista saadut hakutulokset voivat olla eri-ikäisiä. Tarkastuksessa käytettiin ensisijaisesti saman päivän selaimessa näkyneitä tietoja ja tuoretta raporttikirjastoa. Arvostelujen aitoutta, toimitusnopeutta tai tuotteiden laatua ei riippumattomasti testattu.

### Viranomais- ja tekniset lähteet

[S1]: https://fimea.fi/valvonta/luokittelu?navopen=0&textoutputmode=1
[S2]: https://www.finas.fi/akkreditointi/Akkreditointialueet/Sivut/Testauslaboratoriot.aspx
[S3]: https://support.stripe.com/questions/restricted-business-list-and-considerations
[S4]: https://www.kkv.fi/kuluttaja-asiat/tietoa-ja-ohjeita-yrityksille/verkkokauppiaille/kuluttajalle-annettavat-tiedot-ja-niiden-esittaminen-verkkokaupoissa/
[S5]: https://www.kkv.fi/kuluttaja-asiat/verkkokauppa/usein-kysyttya-verkko-ostamisesta/
[S6]: https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/
[S7]: https://web.dev/articles/vitals

- [S1] Fimea: luokittelun valmistekohtaisuus. Viranomaisen hakupoiminta tarkastettu 11.10.2026.
- [S2] FINAS: testauslaboratorion akkreditoinnin pätevyysalue.
- [S3] Stripe: rajoitetun toiminnan tilikohtainen arviointi ja hyväksyntä; ei Averianin tilikohtainen hyväksyntä.
- [S4] KKV: verkkokaupan tiedot, vahvistukset ja vuoden 2026 peruuttamistoiminto.
- [S5] KKV: kuljetuksessa vahingoittunut tavara ja myyjän vastuu.
- [S6] Netlify: omat verkkotunnukset ja julkaisuympäristöt.
- [S7] web.dev: Core Web Vitals -tavoiterajat.

**Suunnitelman onnistumiskriteeri:** asiakas löytää hyväksytyn tuotteen, ymmärtää sen sisällön ja kokonaishinnan, tarkistaa oikean erän raportit, maksaa toimivalla tavalla ja saa tilauksensa ilmoitetun prosessin mukaisesti.

