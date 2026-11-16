/** SoWi-Karten als Auswahlfragen: je drei falsche, aber plausible Antworten (Thema T13 Unternehmen & Wirtschaft). */
export const T13: Record<string, [string, string, string]> = {
  "k:wu0": [
    "Gründung: privatschriftlicher Gesellschaftsvertrag; die GmbH entsteht mit Vertragsunterzeichnung. Stammkapital: mindestens 25.000 €, vollständig bei Anmeldung eingezahlt. Haftung: die Gesellschafter haften bis zur doppelten Höhe ihrer Einlage.",
    "Gründung: notariell beurkundeter Gesellschaftsvertrag; die GmbH entsteht mit Eintragung ins Handelsregister (Abteilung A). Stammkapital: mindestens 50.000 €, davon 25.000 € eingezahlt. Haftung: nur mit dem Gesellschaftsvermögen.",
    "Gründung: notariell beurkundeter Gesellschaftsvertrag; Eintragung ins Handelsregister (Abteilung B). Stammkapital: mindestens 12.500 €, bei Anmeldung mindestens 6.250 € eingezahlt. Haftung: Gesellschaftsvermögen und subsidiär das Privatvermögen der Gesellschafter.",
  ],
  "k:wu1": [
    "Vorstand: leitet die Gesellschaft und vertritt sie nach außen. Hauptversammlung: oberstes Beschlussorgan. Aufsichtsrat: bei jeder GmbH Pflicht – hier also nötig.",
    "Geschäftsführer: leitet die Gesellschaft und vertritt sie nach außen. Gesellschafterversammlung: oberstes Beschlussorgan. Aufsichtsrat: ab mehr als 20 Arbeitnehmern Pflicht – hier also nötig.",
    "Geschäftsführer: führt die Geschäfte nur intern, vertreten wird die GmbH vom Aufsichtsrat. Gesellschafterversammlung: berät nur. Aufsichtsrat: ab mehr als 2.000 Arbeitnehmern Pflicht – hier also nicht.",
  ],
  "k:wu2": [
    "Regel: Verteilung nach Köpfen (§ 29 Abs. 3 GmbHG), wenn der Gesellschaftsvertrag nichts anderes regelt. A: 50.000 € ÷ 2 = 25.000 € B: 50.000 € ÷ 2 = 25.000 €",
    "Regel: 4 % Vorabverzinsung der Anteile, Rest nach Köpfen (§ 121 HGB). A: 600 € + 24.000 € = 24.600 € B: 400 € + 24.000 € = 24.400 €",
    "Regel: Verteilung nach dem Verhältnis der Geschäftsanteile (§ 29 Abs. 3 GmbHG). A: 50.000 € × 15/50 = 15.000 € B: 50.000 € × 10/50 = 10.000 €, Rest in die Rücklage",
  ],
  "k:wu3": [
    "„Mini-GmbH“: Stammkapital ab 1 €, die Gründerin haftet aber bis 25.000 € persönlich. Besonderheit: Gewinne dürfen erst nach 5 Jahren ausgeschüttet werden.",
    "„Mini-GmbH“: Stammkapital ab 12.500 €, Haftung nur mit dem Gesellschaftsvermögen. Besonderheit: 50 % des Jahresüberschusses müssen in eine Rücklage, bis 50.000 € erreicht sind.",
    "„Mini-AG“: Grundkapital ab 1 €, Haftung nur mit dem Gesellschaftsvermögen. Besonderheit: 10 % des Jahresüberschusses müssen in eine Rücklage, bis 25.000 € erreicht sind; dann wird sie automatisch zur AG.",
  ],
  "k:wu4": [
    "Grundkapital mindestens 25.000 €. Geschäftsführer: leitet und vertritt die AG. Aufsichtsrat: beschließt über die Gewinnverwendung. Gesellschafterversammlung: bestellt und überwacht den Vorstand.",
    "Grundkapital mindestens 50.000 €. Vorstand: überwacht die Geschäftsführung. Aufsichtsrat: leitet und vertritt die AG. Hauptversammlung: bestellt den Vorstand und führt die laufenden Geschäfte.",
    "Grundkapital mindestens 100.000 €. Vorstand: leitet und vertritt die AG. Aufsichtsrat: bestellt und überwacht den Vorstand. Betriebsrat: beschließt über Gewinnverwendung und Satzungsänderungen.",
  ],
  "k:wu5": [
    "Komplementär (Herr Becker): haftet nur bis zur Höhe seiner Einlage und führt die Geschäfte. Kommanditist (Tante): haftet unbeschränkt, ist aber von der Geschäftsführung ausgeschlossen.",
    "Komplementär (Tante): haftet nur mit ihrer Einlage und hat Kontrollrechte. Kommanditist (Herr Becker): haftet unbeschränkt mit seinem Privatvermögen und führt die Geschäfte.",
    "Komplementär (Herr Becker): haftet unbeschränkt und führt die Geschäfte. Kommanditist (Tante): haftet ebenfalls unbeschränkt, aber nur nachrangig, und ist gleichberechtigt an der Geschäftsführung beteiligt.",
  ],
  "k:wu6": [
    "Die Gesellschafter haften nur mit ihrer Einlage. Der Lieferant muss sich zuerst an das Gesellschaftsvermögen halten und kann von jedem Gesellschafter höchstens die Hälfte (10.000 €) verlangen.",
    "Alle Gesellschafter haften unbeschränkt, aber anteilig (jeder nur für seinen Anteil) und erst nachdem die Zwangsvollstreckung in das Gesellschaftsvermögen erfolglos war. Der Lieferant bekommt von jedem 10.000 €.",
    "Nur der geschäftsführende Gesellschafter haftet unbeschränkt; der andere haftet bis zur Höhe seiner Einlage. Der Lieferant kann die 20.000 € nur vom Geschäftsführer verlangen.",
  ],
  "k:wu7": [
    "Nicht öffentliches Verzeichnis, geführt bei der IHK. Abteilung A: Kapitalgesellschaften. Abteilung B: Einzelkaufleute und Personengesellschaften. Einsicht nur mit berechtigtem Interesse – der Lieferant muss einen Antrag stellen.",
    "Öffentliches Verzeichnis, geführt beim Finanzamt. Abteilung A: Personengesellschaften und GmbH. Abteilung B: Aktiengesellschaften. Jeder darf Einsicht nehmen – die Mainz Data GmbH steht in Abteilung A.",
    "Öffentliches Verzeichnis, geführt beim Gewerbeamt der Gemeinde. Abteilung A: Handwerksbetriebe. Abteilung B: alle übrigen Unternehmen. Einsicht nur für Behörden – der Lieferant muss beim Unternehmen nachfragen.",
  ],
  "k:wu8": [
    "Einliniensystem: Mitarbeiter haben mehrere fachliche Vorgesetzte; kurze Wege. Mehrliniensystem: jeder hat genau einen Vorgesetzten; klare Wege. Stabliniensystem: Stabsstellen erteilen fachliche Weisungen. Matrixorganisation: Abteilungen arbeiten völlig getrennt nebeneinander.",
    "Einliniensystem: Jeder hat genau einen Vorgesetzten; klare, aber lange Dienstwege. Mehrliniensystem: Stabsstellen beraten die Leitung. Stabliniensystem: Mitarbeiter haben mehrere Vorgesetzte. Matrixorganisation: Gliederung nur nach Projekten, ohne Abteilungen.",
    "Einliniensystem: Jeder hat genau einen Vorgesetzten. Mehrliniensystem: mehrere fachliche Vorgesetzte. Stabliniensystem: Stabsstellen haben volle Weisungsbefugnis gegenüber den Abteilungen. Matrixorganisation: Teams ohne Vorgesetzte, die sich selbst steuern.",
  ],
  "k:wu9": [
    "Wirtschaftlichkeit = Aufwand ÷ Ertrag = 400.000 ÷ 500.000 = 0,8 Eigenkapitalrentabilität = Gewinn ÷ Eigenkapital × 100 = 100.000 ÷ 800.000 × 100 = 12,5 % Arbeitsproduktivität = 2.000 ÷ 10 = 200 Teile je Mitarbeiter und Tag",
    "Wirtschaftlichkeit = Ertrag ÷ Aufwand = 500.000 ÷ 400.000 = 1,25 Eigenkapitalrentabilität = Ertrag ÷ Eigenkapital × 100 = 500.000 ÷ 800.000 × 100 = 62,5 % Arbeitsproduktivität = 2.000 ÷ 10 = 200 Teile je Mitarbeiter und Tag",
    "Wirtschaftlichkeit = Ertrag − Aufwand = 100.000 € Eigenkapitalrentabilität = Gewinn ÷ Eigenkapital × 100 = 100.000 ÷ 800.000 × 100 = 12,5 % Arbeitsproduktivität = Arbeitseinsatz ÷ Ausbringung = 10 ÷ 2.000 = 0,005",
  ],
  "k:wu10": [
    "Polypol: viele Anbieter, viele Nachfrager → Smartphone-Betriebssysteme Oligopol: wenige Anbieter, viele Nachfrager → Bäckerbrötchen in der Großstadt Monopol: ein Anbieter → Trinkwasserversorgung",
    "Polypol: viele Anbieter, ein Nachfrager → Trinkwasserversorgung Oligopol: wenige Anbieter, wenige Nachfrager → Smartphone-Betriebssysteme Monopol: ein Anbieter, viele Nachfrager → Bäckerbrötchen",
    "Polypol: viele Anbieter, viele Nachfrager → Bäckerbrötchen Oligopol: ein Anbieter, wenige Nachfrager → Trinkwasserversorgung Monopol: wenige große Anbieter → Smartphone-Betriebssysteme",
  ],
  "k:wu11": [
    "Viele Anbieter und Nachfrager Staatliche Preisaufsicht Freier Marktzugang Gleiche Preise auf allen Märkten Begründung: Computerspiele werden zu unterschiedlichen Preisen verkauft – damit fehlt die Preisaufsicht.",
    "Homogene Güter Vollständige Markttransparenz Keine Präferenzen Sofortige Reaktion Begründung: Computerspiele werden online verkauft – damit fehlt die räumliche Nähe von Anbietern und Nachfragern.",
    "Homogene Güter Unvollständige Markttransparenz Persönliche Präferenzen Langsame Reaktion der Marktteilnehmer Begründung: Computerspiele sind gleichartig, aber es gibt zu wenige Anbieter.",
  ],
  "k:wu12": [
    "Aufschwung: Kapazitäten ausgelastet, steigende Preise. Hochkonjunktur: steigende Nachfrage, Investitionen nehmen zu. Abschwung: hohe Arbeitslosigkeit, pessimistische Erwartungen. Tiefstand: sinkende Produktion und Nachfrage.",
    "Aufschwung: steigende Nachfrage und Produktion. Hochkonjunktur: sinkende Preise und steigende Arbeitslosigkeit. Abschwung: steigende Investitionen. Tiefstand: Vollbeschäftigung bei niedrigen Preisen.",
    "Expansion: Kapazitäten nicht ausgelastet, sinkende Löhne. Boom: geringe Investitionen, sinkende Preise. Rezession: steigende Nachfrage, sinkende Arbeitslosigkeit. Depression: steigende Preise, optimistische Erwartungen.",
  ],
  "k:wu13": [
    "Primärer Sektor (Verarbeitung: Industrie, Handwerk) → Autozulieferer Sekundärer Sektor (Urproduktion: Landwirtschaft, Bergbau) → Weingut Tertiärer Sektor (Dienstleistungen) → IT-Dienstleister",
    "Primärer Sektor (Urproduktion) → Weingut und Autozulieferer, da beide Rohstoffe verarbeiten Sekundärer Sektor (Dienstleistungen) → IT-Dienstleister Tertiärer Sektor (Handel und Banken) → keiner",
    "Primärer Sektor (Urproduktion) → Weingut Sekundärer Sektor (Verarbeitung) → Autozulieferer und IT-Dienstleister, da Software ein hergestelltes Produkt ist Tertiärer Sektor (nur Handel und Banken) → keiner",
  ],
  "k:wu14": [
    "Die soziale Marktwirtschaft ist eine Planwirtschaft, in der der Staat Preise und Produktion festlegt und Privateigentum begrenzt. Beispiele: staatliche Preisfestsetzung, Produktionsquoten, Verstaatlichung von Schlüsselindustrien.",
    "Die soziale Marktwirtschaft ist eine freie Marktwirtschaft ohne staatliche Eingriffe; sozialer Ausgleich entsteht allein durch Wettbewerb. Beispiele: freie Preisbildung, Gewerbefreiheit, Vertragsfreiheit.",
    "Die soziale Marktwirtschaft verbindet freien Wettbewerb mit staatlicher Lenkung der Investitionen. Beispiele: staatliche Investitionsplanung, Lohnfestsetzung durch die Regierung, Gewinnobergrenzen.",
  ],
  "k:wu15": [
    "Kartell: Zusammenschluss von Unternehmen, bei dem mindestens eines seine rechtliche Selbstständigkeit verliert. Beurteilung: Die Absprache ist kein Kartell, da die Händler selbstständig bleiben; sie ist erlaubt.",
    "Kartell: Absprache selbstständiger Unternehmen zur Beschränkung des Wettbewerbs. Beurteilung: Gebietsabsprachen sind erlaubt, verboten sind nur Preisabsprachen; das Bundeskartellamt kann nicht eingreifen.",
    "Kartell: Mehrheitsbeteiligung eines Unternehmens an anderen unter einheitlicher Leitung. Beurteilung: Die Vereinbarung ist ein Konzern und muss beim Handelsregister angemeldet werden.",
  ],
  "k:wu16": [
    "Fusion (SoftCo/DataNet): Die Unternehmen bleiben rechtlich selbstständig, stehen aber unter einheitlicher Leitung. Konzern (Mehrheitsbeteiligung): Die Unternehmen verschmelzen zu einem und verlieren ihre rechtliche Selbstständigkeit.",
    "Fusion: Unternehmen verschmelzen zu einem; alle behalten ihre rechtliche Selbstständigkeit. Konzern: Die Unternehmen verlieren ihre rechtliche, behalten aber ihre wirtschaftliche Selbstständigkeit.",
    "Fusion: Absprache selbstständiger Unternehmen über Preise und Gebiete. Konzern: Unternehmen verschmelzen zu einem neuen Unternehmen mit neuem Namen; die bisherigen Firmen erlöschen.",
  ],
  "k:wu17": [
    "Zielharmonie: Das Erreichen eines Ziels erschwert ein anderes → Energiekosten senken und Gewinn steigern. Zielkonflikt: Das Erreichen eines Ziels fördert ein anderes → Gewinn steigern und Ökostrom beziehen.",
    "Zielharmonie: Die Ziele beeinflussen sich nicht → Gewinn steigern und teuren Ökostrom beziehen. Zielkonflikt: Das Erreichen eines Ziels erschwert ein anderes → Energiekosten senken und Gewinn steigern.",
    "Zielharmonie: Das Erreichen eines Ziels fördert ein anderes → Energiekosten senken und teuren Ökostrom beziehen. Zielkonflikt: Ein Ziel schließt das andere völlig aus → Gewinn steigern und Energiekosten senken.",
  ],
  "k:wu18": [
    "Ökonomisch: CO₂-Emissionen reduzieren, Marktanteil ausbauen. Ökologisch: Gewinn steigern, Elektroschrott vermeiden. Sozial: Liquidität sichern, faire Bezahlung.",
    "Ökonomisch: Gewinn steigern, faire Bezahlung. Ökologisch: Umsatz erhöhen durch grüne Produkte, Energieverbrauch senken. Sozial: Weiterbildung, Liquidität sichern.",
    "Ökonomisch: Gewinn steigern, Umsatz erhöhen. Ökologisch: Marktanteil bei Ökostrom-Kunden ausbauen, Liquidität sichern. Sozial: Elektroschrott vermeiden, CO₂-Emissionen reduzieren.",
  ],
  "k:wu19": [
    "Betrieblich: Spezialisierung auf Berufe und Branchen. Volkswirtschaftlich: Zerlegung der Arbeit in Abteilungen eines Unternehmens. International: Spezialisierung von Unternehmen innerhalb eines Landes.",
    "Betrieblich: Zerlegung der Arbeit innerhalb eines Unternehmens. Volkswirtschaftlich: Spezialisierung von Ländern auf bestimmte Güter. International: Spezialisierung auf Berufe und Wirtschaftssektoren.",
    "Betrieblich: Aufteilung der Arbeit zwischen Arbeitgeber und Betriebsrat. Volkswirtschaftlich: Aufteilung der Steuereinnahmen auf Bund und Länder. International: Arbeitsteilung innerhalb der EU-Institutionen.",
  ],
  "k:wu20": [
    "Faktoren: Einführung von Schutzzöllen, steigende Transportkosten, nationale Datenschutzgesetze. Vorteil: Schutz heimischer Arbeitsplätze. Nachteil: geringere Abhängigkeit von Lieferketten.",
    "Faktoren: Abbau von Zöllen, sinkende Transportkosten, Internet. Vorteil: Abhängigkeit von Lieferketten. Nachteil: größere Absatzmärkte und günstigere Beschaffung.",
    "Faktoren: Abbau von Zöllen, steigende Kommunikationskosten, Kapitalverkehrskontrollen. Vorteil: weniger Auswahl, aber höhere Qualität für Verbraucher. Nachteil: Verlagerung von Arbeitsplätzen.",
  ],
  "k:wu21": [
    "Lebenslauf der Gründerin Ausbildungszeugnisse Arbeitsverträge der Beschäftigten Handelsregisterauszug Steuerbescheide der letzten 3 Jahre Zweck: gesetzlich vorgeschriebene Anmeldung beim Gewerbeamt.",
    "Geschäftsidee Markt- und Wettbewerbsanalyse Marketing Rechtsform Finanzplanung Zweck: Nachweis gegenüber dem Finanzamt zur Festsetzung der Steuervorauszahlungen.",
    "Geschäftsidee Produktbeschreibung Quellcode der App Patentanmeldung Preisliste Zweck: Grundlage für die Eintragung ins Handelsregister und Schutz der Geschäftsidee.",
  ],
};
