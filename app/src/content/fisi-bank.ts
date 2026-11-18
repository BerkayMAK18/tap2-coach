import type { CardQuestion, McQuestion, Question, Topic } from "./schema";
import { subnetQuestions } from "./fisi/subnetting";
import { wisoQuestions } from "./fisi/wiso";
import { ADMIN_SPECS, NETWORK_SPECS, OPERATIONS_SPECS, PROJECT_SPECS, SECURITY_SPECS, ihk } from "./fisi/ihk";

export const FISI_TOPICS: Topic[] = [
  { id: "si-adressierung", n: "IPv4-Adressierung & Subnetting", teil: "Teil 2", prio: "Muss", ic: "server", th: [], decks: [], cats: [] },
  { id: "si-projekt", n: "Projekt Systemintegration", teil: "Teil 2", prio: "Muss", ic: "check", th: [], decks: [], cats: [] },
  { id: "si-wiso", n: "Wirtschafts- und Sozialkunde", teil: "SoWi", prio: "Wichtig", ic: "calendar", th: [], decks: [], cats: [] },
];

const card = (id: string, topic: string, q: string, a: string): CardQuestion => ({ id, type: "card", topic, q, a, note: "", code: false });
const mc = (id: string, topic: string, q: string, opts: [string, string, string, string], right: number, why: string): McQuestion => ({ id, type: "mc", topic, q, opts, right, why });
const cards = (slug: string, topic: string, rows: [string, string][]): CardQuestion[] => rows.map(([q, a], i) => card(`fisi:card:${slug}-${String(i + 1).padStart(2, "0")}`, topic, q, a));

const CIDR_CASES: [string, number][] = [
  ["10.12.34.56", 24], ["10.12.34.129", 25], ["10.12.34.67", 26], ["192.168.10.77", 27],
  ["192.168.10.201", 28], ["192.168.10.41", 29], ["192.168.10.10", 30], ["172.20.5.201", 23],
  ["172.20.7.88", 22], ["10.44.19.201", 21], ["10.44.25.77", 20], ["172.19.88.44", 19],
  ["172.19.203.17", 18], ["10.73.205.91", 17], ["10.88.12.201", 16], ["192.168.144.19", 20],
  ["192.168.152.211", 21], ["10.200.5.99", 22], ["172.30.18.221", 23], ["192.168.50.199", 24],
  ["192.168.50.139", 25], ["192.168.50.77", 26], ["192.168.50.46", 27], ["192.168.50.22", 28],
  ["10.1.2.3", 30], ["10.1.2.137", 25], ["10.1.3.210", 26], ["10.1.4.99", 27],
  ["172.16.8.33", 28], ["172.16.8.14", 29], ["192.168.70.130", 26], ["192.168.70.222", 27],
  ["10.90.4.19", 23], ["10.90.6.211", 24], ["172.22.40.201", 22], ["172.22.60.31", 20],
  ["192.168.100.198", 25], ["192.168.101.111", 26], ["10.15.31.241", 28], ["10.15.31.13", 29],
  ["172.28.99.17", 18], ["10.128.8.8", 17], ["172.24.20.100", 19], ["192.168.200.130", 27],
  ["10.60.44.202", 21], ["10.60.52.111", 20], ["172.18.4.200", 24], ["192.168.33.250", 30],
  ["192.168.201.45", 24], ["192.168.201.155", 25], ["192.168.201.70", 26], ["192.168.201.183", 27],
  ["192.168.201.237", 28], ["192.168.201.25", 29], ["192.168.201.50", 30], ["10.77.31.5", 23],
  ["10.77.30.129", 22], ["172.31.99.17", 21], ["172.31.201.40", 20], ["10.101.188.33", 19],
  ["10.101.217.44", 18], ["192.168.128.66", 17], ["192.168.12.201", 24], ["192.168.12.156", 25],
  ["192.168.12.101", 26], ["192.168.12.193", 27], ["192.168.12.225", 28], ["192.168.12.54", 29],
  ["172.25.14.70", 23], ["172.25.19.151", 22], ["10.22.56.201", 21], ["10.22.66.70", 20],
  ["172.16.128.222", 18], ["10.33.44.222", 17],
];

const ipToInt = (ip: string) => ip.split(".").reduce((n, octet) => ((n << 8) | Number(octet)) >>> 0, 0);
const intToIp = (n: number) => [24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join(".");
// Rechenkarten und Netzadress-Fragen der ersten Fassung (stabile IDs); neue Aufgabenarten stehen in fisi/subnetting.ts.
function legacySubnetQuestions(): Question[] {
  const out: Question[] = [];
  CIDR_CASES.forEach(([ip, prefix], i) => {
    const address = ipToInt(ip), mask = (0xffffffff << (32 - prefix)) >>> 0;
    const network = (address & mask) >>> 0, block = 2 ** (32 - prefix);
    const broadcast = (network + block - 1) >>> 0, hosts = block - 2;
    const n = String(i + 1).padStart(2, "0");
    out.push(card(`fisi:card:cidr-net-${n}`, "si-adressierung", `Bestimme Netzadresse, Broadcast-Adresse und nutzbaren Hostbereich für die CIDR-Adresse ${ip}/${prefix}.`, `Netzadresse: ${intToIp(network)}. Broadcast: ${intToIp(broadcast)}. Nutzbare Hosts: ${intToIp((network + 1) >>> 0)} bis ${intToIp((broadcast - 1) >>> 0)} (${hosts} Adressen).`));
    const candidates = [network, address, broadcast, (network + block) >>> 0, (network + 2) >>> 0];
    const networkOpts = [...new Set(candidates)].slice(0, 4);
    while (networkOpts.length < 4) networkOpts.push((network + block * (networkOpts.length + 1)) >>> 0);
    // Antwortposition wechselt reihum, damit die richtige Antwort nicht immer vorn steht.
    networkOpts.unshift(...networkOpts.splice(networkOpts.length - (i % 4)));
    const right = networkOpts.indexOf(network);
    out.push(mc(`fisi:mc:cidr-network-${n}`, "si-adressierung", `Welche Netzadresse gehört zur CIDR-Adresse ${ip}/${prefix}?`, networkOpts.map(intToIp) as [string, string, string, string], right, `Die Netzadresse entsteht durch bitweises UND der IPv4-Adresse mit der Subnetzmaske zu /${prefix}.`));
  });
  return out;
}

const NETWORK_CARDS: [string, string][] = [
  ["Ein Client erreicht das Gateway per IP, aber keine DNS-Namen. Welche zwei Prüfungen grenzen den Fehler ein?", "Namensauflösung mit nslookup oder dig prüfen und DNS-Server sowie Suchsuffix der Clientkonfiguration kontrollieren. Danach DNS-Erreichbarkeit und passende Protokollports prüfen."],
  ["Ein Gerät erhält eine APIPA-Adresse. Was deutet das an?", "Der Client hat keine gültige DHCP-Konfiguration erhalten und sich selbst eine Link-Local-Adresse zugewiesen. DHCP-Erreichbarkeit, VLAN, Relay und Adresspool prüfen."],
  ["Wozu dient ARP in einem IPv4-LAN?", "ARP ermittelt zu einer lokalen IPv4-Adresse die zugehörige MAC-Adresse, damit ein Ethernet-Frame an den nächsten lokalen Empfänger adressiert werden kann."],
  ["Ein Switchport verbindet einen einzelnen Arbeitsplatz in genau einem VLAN. Welcher Portmodus passt typischerweise?", "Ein Access-Port, dem das gewünschte VLAN untagged zugeordnet ist."],
  ["Ein Uplink muss mehrere VLANs transportieren. Was ist auf beiden Switchseiten abzustimmen?", "Ein Trunk mit übereinstimmender VLAN-Zulassung und konsistenter Tagging-Konfiguration; ungenutzte VLANs sollten nicht unnötig freigegeben sein."],
  ["Was verhindert Spanning Tree in redundanten Ethernet-Topologien?", "Es verhindert Layer-2-Schleifen, indem redundante Pfade logisch blockiert und bei Ausfall geeignete Pfade freigeschaltet werden."],
  ["Welche Aufgabe hat ein Default-Route-Eintrag?", "Er leitet Pakete für Ziele ohne spezifischeren Routeneintrag an den festgelegten nächsten Hop weiter."],
  ["Warum kann ein erfolgreicher Ping einen Anwendungsfehler nicht ausschließen?", "ICMP-Erreichbarkeit beweist weder, dass der benötigte TCP/UDP-Port offen ist, noch dass Dienst, TLS, Authentisierung oder Anwendung korrekt funktionieren."],
  ["Wann ist TCP gegenüber UDP häufig die passende Wahl?", "Wenn die Anwendung eine geordnete, zuverlässige Byteübertragung benötigt und Verluste oder Umordnung nicht selbst behandelt."],
  ["Was liefert DNS grundsätzlich zurück?", "DNS ordnet Namen und weitere DNS-Datensätze wie Adressen, Mailserver oder Serviceinformationen zu; die Antwort hängt vom abgefragten Recordtyp ab."],
  ["Welcher DNS-Recordtyp verweist auf einen anderen kanonischen Namen?", "CNAME."],
  ["Weshalb reicht ein VLAN allein nicht als Sicherheitsgrenze?", "VLANs segmentieren Layer 2, aber Routing zwischen VLANs kann weiterhin möglich sein. Zugriff muss zusätzlich mit Firewall- oder ACL-Regeln begrenzt werden."],
  ["Was ist bei einer WLAN-Messung außer dem Signalpegel zu beachten?", "Kanalbelegung, Störungen, Sendeleistung, Band, Clientfähigkeiten, Roaming und tatsächlicher Durchsatz am Nutzungsort."],
  ["Was bringt ein Site-to-Site-VPN zwischen zwei Standorten?", "Es schützt den IP-Verkehr zwischen den Netzen über ein unsicheres Transportnetz durch Verschlüsselung und authentisierte Tunnelendpunkte."],
  ["Welche Funktion hat NAT am Internetübergang?", "Es übersetzt IP-Adressen zwischen Netzen, beispielsweise private Quelladressen auf eine öffentliche Adresse. NAT ersetzt keine Firewallregel."],
  ["Was prüft ein TLS-Zertifikat beim Verbindungsaufbau?", "Es bindet einen öffentlichen Schlüssel an eine Identität und wird auf Gültigkeit, Vertrauenskette und passenden Namen geprüft."],
  ["Wann ist Link Aggregation sinnvoll?", "Wenn mehrere physische Links zwischen Geräten als logischer Verbund mehr Bandbreite oder Redundanz bieten sollen; Konfiguration und Gegenstelle müssen zusammenpassen."],
  ["Was bewirkt QoS in einem ausgelasteten Netz?", "Es klassifiziert und priorisiert Verkehr anhand definierter Regeln. QoS schafft keine zusätzliche Bandbreite und muss Ende zu Ende geplant werden."],
  ["Welche zwei Werte helfen beim Einordnen eines Paketverlusts?", "Messungen an mehreren Netzabschnitten und Zeitpunkten sowie Interface-Zähler wie Drops, Fehler, Queue-Überläufe und Auslastung."],
  ["Warum sollte ein DHCP-Adresspool Reserven enthalten?", "Damit neue oder länger abwesende Clients noch Adressen erhalten und statische Reservierungen sowie kurzfristige Lastspitzen nicht zum Poolmangel führen."],
  ["Wozu dient IPv6 Neighbor Discovery?", "Es unterstützt unter anderem Nachbarerkennung, Router-Ermittlung und Duplicate Address Detection im lokalen IPv6-Netz."],
  ["Wie unterscheiden sich Stateful- und Stateless-IPv6-Adresskonfiguration grob?", "Bei Stateless-Konfiguration erzeugt der Host typischerweise selbst eine Adresse aus Routerinformationen; Stateful DHCPv6 weist Adressen und weitere Parameter zentral zu."],
  ["Ein Standortausfall betrifft gleichzeitig primären und Ersatzrouter. Welche Ursache sollte geprüft werden?", "Gemeinsame Fehlerdomänen wie Stromversorgung, Uplink, Standort, Konfiguration oder zentrale Abhängigkeiten."],
  ["Wozu wird ein Loopback-Interface auf einem Router häufig verwendet?", "Als stabile logische Adresse für Management, Routing-Protokolle oder Monitoring, unabhängig vom Status eines einzelnen physischen Ports."],
  ["Warum kann ein Client eine IPv4-Adresse erreichen, aber keine Verbindung zu einem anderen Subnetz herstellen?", "Prüfen, ob Netzmaske und Standardgateway korrekt sind und ob Routing sowie Firewallregeln den Rück- und Hinweg erlauben."],
  ["Was ist der Zweck eines DHCP-Relays?", "Es leitet DHCP-Anfragen aus einem Clientnetz an einen DHCP-Server in einem anderen Netz weiter."],
  ["Was kann eine doppelt vergebene statische IP-Adresse auslösen?", "Wechselnde Erreichbarkeit und ARP-Konflikte. Adressverwaltung, DHCP-Ausschlüsse und Gerätezuordnung prüfen."],
  ["Wofür steht die MTU?", "Sie bezeichnet die maximale Paketgröße, die ein Netzwerklink ohne Fragmentierung übertragen kann."],
  ["Wie kann ein Pfad-MTU-Problem sichtbar werden?", "Kleine Pakete funktionieren, größere Übertragungen hängen oder brechen ab. MTU auf dem Pfad und erforderliche ICMP-Rückmeldungen prüfen."],
  ["Wozu dient ein DNS-TTL-Wert?", "Er gibt an, wie lange ein DNS-Eintrag von Resolvern zwischengespeichert werden darf, bevor erneut abgefragt wird."],
  ["Warum sollte ein DNS-Änderungsplan die bisherige TTL berücksichtigen?", "Resolver können alte Antworten bis zum Ablauf ihrer zuvor gespeicherten TTL weiterverwenden."],
  ["Was unterscheidet einen Forward-Proxy von einem Reverse-Proxy?", "Ein Forward-Proxy handelt typischerweise im Auftrag von Clients; ein Reverse-Proxy nimmt Anfragen vor internen Servern entgegen und verteilt oder schützt sie."],
  ["Warum sind offene Managementports aus dem Internet riskant?", "Sie vergrößern die erreichbare Angriffsfläche. Administration sollte über abgesicherte Managementnetze, VPN oder kontrollierte Jump-Hosts erfolgen."],
  ["Welche Aussage zu einer Firewall-Whitelist trifft zu?", "Sie erlaubt nur ausdrücklich freigegebene Verbindungen und folgt damit grundsätzlich dem Default-Deny-Prinzip."],
  ["Was ist bei einem WLAN-Gastnetz wichtig?", "Gäste vom internen Netz trennen, nur benötigte Dienste erlauben, Zugangsdaten begrenzen und Nutzung gemäß Richtlinien protokollieren."],
  ["Wozu dient ein RADIUS-Server im Netzwerkzugang?", "Er zentralisiert Authentisierung, Autorisierung und oft Accounting für Netzzugänge wie WLAN oder 802.1X."],
  ["Was zeigt eine hohe CRC-Fehlerrate an einem Switchport häufig an?", "Mögliche physische Übertragungsprobleme wie Kabel-, Stecker-, Transceiver- oder Duplexfehler."],
  ["Warum sollte SNMPv1 oder v2c nicht ungeschützt über fremde Netze laufen?", "Community-Strings bieten keine angemessene Vertraulichkeit. Management sollte eingeschränkt und mit sicheren Verfahren wie SNMPv3 betrieben werden."],
  ["Welchen Nutzen hat ein zentraler Syslog-Dienst?", "Geräte senden Meldungen an eine gemeinsame Stelle, wo sie zeitlich korreliert, länger aufbewahrt und ausgewertet werden können."],
  ["Was bedeutet Anycast bei IP-Diensten?", "Mehrere Standorte verwenden dieselbe Zieladresse; das Routing führt Clients typischerweise zu einem erreichbaren nahegelegenen Standort."],
  ["Warum wird bei einer Routingtabelle die spezifischste passende Route bevorzugt?", "Die längste übereinstimmende Präfixlänge beschreibt das Zielnetz am genauesten und bestimmt den passenden nächsten Hop."],
  ["Welche zusätzliche Information liefert traceroute gegenüber ping?", "Es zeigt die antwortenden Zwischenstationen beziehungsweise den Verlauf zum Ziel und kann so Hinweise auf den Abschnitt eines Routingproblems geben."],
  ["Was sollte eine DNS-Resolver-Konfiguration für Clients vermeiden?", "Ungeprüfte oder nicht erreichbare Resolver und inkonsistente interne/externe Namensräume, die zu falschen oder verzögerten Antworten führen."],
  ["Wie wird die Verfügbarkeit einer redundanten Netzwerkverbindung sinnvoll geprüft?", "Nicht nur den Linkstatus, sondern auch Umschaltung, Routing, abhängige Dienste und Wiederherstellung unter kontrollierten Bedingungen testen."],
];

const ADMIN_CARDS: [string, string][] = [
  ["Worin unterscheiden sich RAID und Backup?", "RAID erhöht je nach Level Verfügbarkeit oder Leistung durch mehrere Datenträger. Ein Backup ist eine getrennte Wiederherstellungskopie und schützt auch vor Löschen, Schadsoftware oder logischer Beschädigung."],
  ["Was ist bei RAID 5 als Risiko zu berücksichtigen?", "Es toleriert den Ausfall eines Laufwerks, aber ein weiterer Fehler während des Wiederaufbaus kann zum Datenverlust führen. RAID ersetzt keine Sicherung."],
  ["Wann passt RAID 10 typischerweise?", "Wenn hohe I/O-Leistung und Spiegelungsredundanz gewünscht sind und die nutzbare Kapazität von ungefähr der Hälfte der Rohkapazität akzeptabel ist."],
  ["Welche drei Grundtypen von Sicherungen unterscheidet man häufig?", "Vollsicherung, inkrementelle Sicherung seit der letzten Sicherung und differenzielle Sicherung seit der letzten Vollsicherung."],
  ["Was sagt eine erfolgreiche Backup-Meldung noch nicht aus?", "Dass die Daten vollständig und rechtzeitig rücksicherbar sind. Dafür sind regelmäßige Restore-Tests erforderlich."],
  ["Warum ist ein Snapshot kein Ersatz für ein Backup?", "Ein Snapshot liegt oft im selben Speichersystem und kann durch dessen Ausfall, Fehlkonfiguration oder Schadsoftware ebenfalls verloren gehen."],
  ["Was bedeutet das 3-2-1-Prinzip?", "Mindestens drei Datenkopien, auf mindestens zwei unterschiedlichen Medientypen, davon mindestens eine Kopie getrennt beziehungsweise außerhalb des Primärstandorts."],
  ["Wie lässt sich Speicherbedarf für eine VM grob planen?", "Kapazität, Wachstum, IOPS, Redundanz, Snapshotbedarf, Sicherungsfenster und Aufbewahrung berücksichtigen und Reserven anhand gemessener Last dimensionieren."],
  ["Was ist der Zweck einer organisatorischen Einheit in einem Verzeichnisdienst?", "Objekte strukturiert zu verwalten und Richtlinien oder Delegationen auf definierte Benutzer- und Gerätegruppen anzuwenden."],
  ["Warum sollten administrative Konten getrennt von Alltagskonten sein?", "So wird die Angriffsfläche reduziert und für administrative Handlungen können stärkere Schutzmaßnahmen und nachvollziehbare Rechte gelten."],
  ["Was ist der Vorteil rollenbasierter Berechtigungen?", "Rechte werden Rollen statt Einzelpersonen zugewiesen. Änderungen und Prüfungen sind dadurch konsistenter und leichter nachvollziehbar."],
  ["Wozu dient ein Konfigurationsmanagement?", "Es hält Sollzustände von Systemen nachvollziehbar fest, erkennt Abweichungen und unterstützt reproduzierbare Änderungen."],
  ["Was bedeutet idempotente Automatisierung?", "Wiederholtes Ausführen führt zum gleichen gewünschten Endzustand, ohne ungewollte zusätzliche Änderungen zu erzeugen."],
  ["Wie sollte ein Patch für ein kritisches Serversystem eingeführt werden?", "Risiko und Abhängigkeiten prüfen, Sicherung und Rückfall planen, zuerst repräsentativ testen, Wartungsfenster und Freigabe koordinieren und danach Funktion sowie Logs kontrollieren."],
  ["Welche Inhalte gehören in ein Wartungsfenster?", "Betroffene Dienste, Start-/Endzeit, verantwortliche Personen, erwartete Unterbrechungen, Prüfplan, Kommunikation und Rückfallkriterien."],
  ["Was hilft bei der Fehlersuche nach einem fehlgeschlagenen Dienststart?", "Exitstatus, Dienstprotokoll, Systemlogs, Konfigurationsänderungen, Berechtigungen und verfügbare Ressourcen in zeitlicher Reihenfolge prüfen."],
  ["Warum sollte Systemzeit zentral synchronisiert werden?", "Konsistente Zeitstempel erleichtern Protokollkorrelation, Authentisierung, Zertifikatsprüfung und verteilte Fehleranalyse."],
  ["Was ist beim Erneuern eines TLS-Zertifikats zu beachten?", "Passende Namen und SANs, vollständige Zertifikatskette, Schlüsselzuordnung, Ablaufzeit, Dienstneustart beziehungsweise Reload und Prüfung aus Clientperspektive."],
  ["Wie unterscheiden sich Dateisystemberechtigung und Freigabeberechtigung?", "Bei vielen Plattformen wirken beide Ebenen gemeinsam; maßgeblich ist häufig die restriktivere effektive Berechtigung. Beide Ebenen müssen geprüft werden."],
  ["Welche Folgen kann ein volles Dateisystem haben?", "Dienste können keine Logs, temporären Dateien oder Nutzdaten mehr schreiben; dadurch können Anwendungen ausfallen oder Daten beschädigt werden."],
  ["Was sollte eine sinnvolle Monitoring-Schwelle berücksichtigen?", "Normale Grundlast, Dauer und Schwere der Abweichung, Abhängigkeiten und handlungsfähige Eskalation statt einzelner kurzzeitiger Ausschläge."],
  ["Warum sollten Protokolle zentral und zugriffsgeschützt gesammelt werden?", "Sie bleiben auch nach einem Hostausfall verfügbar, lassen sich korrelieren und sind besser gegen Manipulation oder unberechtigte Einsicht schützbar."],
  ["Was ist beim Abschalten eines nicht mehr benötigten Servers zu dokumentieren?", "Freigabe, Datenaufbewahrung, Abhängigkeiten, Sicherung, Nutzerinformation, Deprovisionierung, Lizenzrückgabe und Nachweis der Außerbetriebnahme."],
  ["Wann ist ein Container gegenüber einer VM sinnvoll?", "Für isolierte Anwendungen mit passenden Laufzeitabhängigkeiten und gemeinsamem Hostkernel; für andere Kernel oder stärkere Betriebssystemisolation kann eine VM besser passen."],
  ["Wofür wird eine Linux-Umask verwendet?", "Sie legt fest, welche Berechtigungsbits bei neu angelegten Dateien und Verzeichnissen standardmäßig nicht gesetzt werden."],
  ["Warum sollte ein Dienst nicht mit Root- oder Administratorrechten laufen, wenn es nicht nötig ist?", "Ein Fehler oder eine Kompromittierung erhält sonst unnötig weitreichenden Zugriff. Ein dediziertes Konto mit Minimalrechten begrenzt den Schaden."],
  ["Was prüft ein Health Check bei einem Serverdienst?", "Ob der Dienst fachlich erreichbar und funktionsfähig ist, nicht nur ob Prozess oder Host noch laufen."],
  ["Was bedeutet RPO bei der Wiederherstellungsplanung?", "Recovery Point Objective: der maximal akzeptable Datenverlustzeitraum, gemessen bis zum letzten wiederherstellbaren Stand."],
  ["Was bedeutet RTO bei der Wiederherstellungsplanung?", "Recovery Time Objective: die angestrebte maximale Zeit bis zur Wiederaufnahme eines Dienstes."],
  ["Warum müssen RPO und RTO fachlich abgestimmt werden?", "Sie bestimmen Kosten und technische Maßnahmen für Sicherung, Replikation, Ersatzsysteme und Wiederanlauf und müssen zum Geschäftsbedarf passen."],
  ["Wozu dient ein UPS-System für Server?", "Es überbrückt kurze Stromausfälle, schützt vor bestimmten Versorgungsproblemen und ermöglicht kontrolliertes Herunterfahren."],
  ["Was sollte ein kontrolliertes Herunterfahren bei Stromausfall zuerst sichern?", "Daten und Dateisysteme durch geordnetes Stoppen kritischer Dienste; Reihenfolge und Schwellenwerte müssen zur USV-Laufzeit passen."],
  ["Was bedeutet Least Functionality bei einem Server?", "Nur benötigte Rollen, Dienste, Pakete und Schnittstellen aktivieren, um Angriffsfläche und Wartungsaufwand zu reduzieren."],
  ["Was sollte ein Betriebssystem-Hardening dokumentieren?", "Sollkonfiguration, deaktivierte Funktionen, Konten und Rechte, Patchstand, Firewallregeln sowie Abweichungen und Ausnahmen."],
  ["Wozu dienen Gruppenrichtlinien in einer Windows-Umgebung?", "Sie erlauben die zentrale Verwaltung ausgewählter Benutzer- und Geräteeinstellungen für definierte Gruppen oder Organisationseinheiten."],
  ["Warum sollten Gruppenrichtlinien zunächst in einer Testgruppe geprüft werden?", "Fehlerhafte Richtlinien können viele Systeme gleichzeitig beeinflussen; eine Pilotgruppe begrenzt Auswirkungen und ermöglicht gezielte Validierung."],
  ["Was ist beim Bereitstellen eines Dateiservers zu planen?", "Speicher, Verfügbarkeit, Freigaben, Rechte, Sicherung, Wiederherstellung, Protokollierung, Kapazitätswachstum und Datenaufbewahrung."],
  ["Was ist ein LUN im Storage-Kontext?", "Eine logisch bereitgestellte Speichereinheit, die einem Host als Blockgerät präsentiert werden kann."],
  ["Warum sollte Multipathing konfiguriert und getestet werden?", "Mehrere Storagepfade können Ausfallsicherheit bieten und je nach System Last verteilen; Fehlererkennung und Umschaltung müssen nachgewiesen sein."],
  ["Was ist bei einer VM-Vorlage zu beachten?", "Keine wiederverwendeten eindeutigen Maschinenkennungen oder Geheimnisse, ein definierter Patchstand und ein dokumentierter, reproduzierbarer Baselinezustand."],
  ["Warum sind lokale Administratorpasswörter auf vielen Geräten problematisch?", "Wiederverwendete Zugangsdaten ermöglichen bei einem einzelnen Diebstahl die Ausbreitung auf weitere Systeme."],
  ["Was sollte ein automatisiertes Konfigurationsskript bei Fehlern tun?", "Fehler sichtbar melden, Änderungen kontrolliert abbrechen oder wiederherstellbar machen und keine Erfolgsmeldung ausgeben, wenn der Sollzustand nicht erreicht wurde."],
  ["Wann ist eine Datenbank- oder Dateisicherung konsistent?", "Wenn alle zusammengehörigen Daten und Metadaten in einem wiederherstellbaren Zustand erfasst wurden, beispielsweise durch anwendungskonsistente Sicherung oder abgestimmtes Stoppen."],
  ["Warum sollten Wiederherstellungsschlüssel getrennt von verschlüsselten Backups gesichert werden?", "Ohne verfügbaren Schlüssel kann eine intakte Sicherung unbrauchbar sein; gleichzeitig muss der Schlüssel vor unberechtigtem Zugriff geschützt bleiben."],
];

const SECURITY_CARDS: [string, string][] = [
  ["Was ist der Unterschied zwischen Authentisierung und Autorisierung?", "Authentisierung prüft, wer ein Benutzer oder System ist. Autorisierung bestimmt anschließend, welche Aktionen es ausführen darf."],
  ["Warum sollte Mehr-Faktor-Authentisierung auch für administrative Zugänge gelten?", "Ein gestohlenes Passwort allein reicht dann nicht zur Anmeldung; privilegierte Konten erhalten so eine zusätzliche Schutzschicht."],
  ["Was ist bei der Einführung eines Passwortmanagers im Unternehmen zu planen?", "Freigabeprozess, zentrale Richtlinien, Wiederherstellungsverfahren, Mehr-Faktor-Schutz, Rollen, Offboarding und sichere gemeinsame Tresore."],
  ["Wie sollte ein kompromittiertes Benutzerkonto behandelt werden?", "Zugang kontrolliert sperren, Sitzungen und Tokens widerrufen, Zugangsdaten über einen sicheren Weg erneuern, Umfang und Aktivitäten prüfen und den Vorfall dokumentieren."],
  ["Wozu dient Netzwerksegmentierung aus Sicherheitssicht?", "Sie begrenzt direkte Kommunikation zwischen Bereichen und kann die Ausbreitung eines Vorfalls oder Schadprogramms erschweren."],
  ["Was sollte eine Firewallregel möglichst genau beschreiben?", "Quelle, Ziel, Dienst oder Port, Richtung, Zweck, Gültigkeit und verantwortliche Freigabe; breite Any-to-any-Regeln sind zu vermeiden."],
  ["Was ist bei der Prüfung einer Firewallregel nach einer Änderung wichtig?", "Nur den erwarteten Verkehr testen, unerwünschte Pfade mitprüfen, Protokolle kontrollieren und nicht mehr benötigte Regeln entfernen."],
  ["Warum ist ein öffentlich erreichbarer Administrationsdienst besonders kritisch?", "Er kann automatisiert angegriffen werden. Zugriff sollte auf notwendige Quellen beschränkt und mit starker Authentisierung sowie Protokollierung geschützt werden."],
  ["Was ist ein Sicherheitsvorfall im Unterschied zu einer normalen Störung?", "Ein Vorfall betrifft oder gefährdet Vertraulichkeit, Integrität oder Verfügbarkeit durch ein mögliches Sicherheitsereignis und braucht den dafür vorgesehenen Melde- und Reaktionsprozess."],
  ["Welche Schritte gehören grundsätzlich zur technischen Incident Response?", "Erkennen, bewerten, eindämmen, Beweise und Protokolle sichern, bereinigen, Dienste kontrolliert wiederherstellen und Erkenntnisse dokumentieren."],
  ["Warum dürfen Protokolle bei einem Sicherheitsvorfall nicht vorschnell gelöscht werden?", "Sie können Zeitlinie, Umfang und Ursache belegen. Aufbewahrung und Zugriff müssen zugleich den Datenschutz- und Löschregeln entsprechen."],
  ["Was ist bei einer Schwachstellenmeldung zunächst zu priorisieren?", "Betroffene Systeme und Erreichbarkeit, bekannte Ausnutzung, Kritikalität, mögliche Schutzmaßnahmen und ein abgestimmter Behebungszeitpunkt."],
  ["Warum sollten Sicherheitsupdates nicht ungeprüft auf alle Systeme ausgerollt werden?", "Kompatibilitäts- oder Verfügbarkeitsprobleme können Dienste beeinträchtigen. Ein gestufter Test mit Rückfallplan reduziert das Betriebsrisiko."],
  ["Wie kann ein Unternehmen das Risiko von Phishing reduzieren?", "Technische Schutzmaßnahmen, Mehr-Faktor-Anmeldung, aktuelle Mailfilter, leicht nutzbare Meldewege und regelmäßige Sensibilisierung kombinieren."],
  ["Was ist bei einem Verdacht auf Ransomware auf einem Arbeitsplatz zuerst wichtig?", "Nach dem Notfallprozess isolieren, keine Beweise beseitigen, den Sicherheitskontakt informieren und weitere Maßnahmen zentral koordinieren."],
  ["Warum sollte ein Sicherheitskonzept auch Lieferanten und Fernzugriffe berücksichtigen?", "Externe Konten und Verbindungen können privilegierte Zugänge in die eigene Umgebung eröffnen und müssen zeitlich, technisch und organisatorisch begrenzt werden."],
  ["Was ist ein Zertifikatssperrlisten- oder OCSP-Prüfziel?", "Es hilft festzustellen, ob ein Zertifikat vor seinem Ablauf widerrufen wurde und nicht mehr als vertrauenswürdig gelten soll."],
  ["Warum müssen private Schlüssel besonders geschützt werden?", "Wer den privaten Schlüssel kontrolliert, kann je nach Verwendungszweck Identitäten vortäuschen, Daten entschlüsseln oder signierte Nachrichten erzeugen."],
  ["Wozu dient ein Sicherheitsbaseline für Server?", "Sie legt einen überprüfbaren Mindestzustand für Konfiguration, Konten, Dienste, Protokollierung und Updates fest."],
  ["Wie kann die Wirksamkeit einer Sicherheitsmaßnahme geprüft werden?", "Mit klaren Akzeptanzkriterien, kontrollierten Tests, Protokollauswertung und regelmäßiger Überprüfung bei Änderungen der Bedrohungslage."],
];

const OPERATIONS_CARDS: [string, string][] = [
  ["Was sollte ein Service Level Agreement (SLA) festlegen?", "Messbare Serviceziele wie Verfügbarkeit oder Reaktionszeiten, Messmethode, Geltungsbereich, Ausnahmen und Zuständigkeiten."],
  ["Warum muss Monitoring einen zuständigen Reaktionsweg haben?", "Ein Alarm ohne verantwortliche Person, Priorität und Handlungsanweisung führt oft zu verspäteter oder uneinheitlicher Bearbeitung."],
  ["Wie unterscheiden sich Reaktionszeit und Lösungszeit?", "Reaktionszeit misst bis zum Beginn einer qualifizierten Bearbeitung; Lösungszeit bis zur Wiederherstellung oder vereinbarten Behebung."],
  ["Was ist ein Workaround bei einer Störung?", "Eine vorläufige Maßnahme, die Auswirkungen begrenzt oder den Dienst nutzbar macht, ohne zwingend die eigentliche Ursache zu beseitigen."],
  ["Wann sollte ein Incident eskaliert werden?", "Wenn Auswirkung, Dringlichkeit, erforderliche Rechte oder benötigte Fachkenntnis die eigene Zuständigkeit übersteigen oder vereinbarte Fristen gefährdet sind."],
  ["Was ist der Nutzen einer eindeutigen Priorisierung von Tickets?", "Sie richtet die Bearbeitungsreihenfolge nach Auswirkung und Dringlichkeit aus und macht Erwartungen für Support und Betroffene transparent."],
  ["Was gehört in eine aussagekräftige Betriebsanweisung?", "Zweck und Umfang, Voraussetzungen, sichere Arbeitsschritte, Prüfungen, Rückfall, Eskalationskontakt und Pflegeverantwortung."],
  ["Wie sollte ein wiederkehrender Serveralarm bewertet werden?", "Muster, Auswirkung, Zeitverlauf, Abhängigkeiten und Trend prüfen; anschließend Schwellenwert oder Ursache gezielt anpassen statt den Alarm pauschal abzuschalten."],
  ["Was ist ein Kapazitätstrend?", "Die Entwicklung einer Ressourcennutzung über die Zeit, mit der Wachstum und ein möglicher Engpass früh abgeschätzt werden."],
  ["Warum sind Service-Abhängigkeiten für die Wiederherstellung wichtig?", "Ein Dienst kann erst funktionieren, wenn benötigte Netzwerk-, Identitäts-, Speicher- oder Datenbankdienste ebenfalls verfügbar sind."],
  ["Was sollte ein Wiederanlaufplan für einen kritischen Dienst enthalten?", "Abhängigkeiten, Reihenfolge, Zuständigkeiten, Zugang zu Sicherungen, Wiederherstellungsschritte, Prüfungen und Kriterien für die Freigabe."],
  ["Wie ist eine Konfigurationsabweichung zu behandeln?", "Abweichung erfassen, erwarteten Sollzustand und Risiko prüfen, freigeben lassen und entweder kontrolliert korrigieren oder als begründete Ausnahme dokumentieren."],
  ["Warum gehört Asset-Inventarisierung zum IT-Betrieb?", "Sie macht Systeme, Eigentümerschaft, Standort, Lebenszyklus, Abhängigkeiten und Supportstatus auffindbar."],
  ["Was sollte beim Offboarding eines Mitarbeiters für IT-Zugänge passieren?", "Identität und Sitzungen nach Freigabe deaktivieren, Gruppen- und Dienstzugänge prüfen, Geräte und Schlüssel zurücknehmen und Aufbewahrung relevanter Daten sicherstellen."],
  ["Was ist bei einer Änderung nach der Umsetzung zu prüfen?", "Sollzustand, betroffene Funktionen, Monitoring, Protokolle, Nutzerwirkung und Rückfallmöglichkeit anhand des vorher festgelegten Testplans."],
  ["Wozu dient eine Ursachenanalyse nach einem wiederkehrenden Ausfall?", "Sie trennt Symptome von der zugrunde liegenden Ursache und leitet Maßnahmen ab, die Wiederholung verhindern oder Auswirkungen begrenzen."],
  ["Warum sollte ein Notfallkontakt regelmäßig aktualisiert werden?", "Veraltete Kontakte verzögern Entscheidungen und Wiederherstellung genau dann, wenn schnelle Erreichbarkeit wichtig ist."],
  ["Was bedeutet Verfügbarkeit von 99,9 Prozent rechnerisch?", "Sie lässt im betrachteten Zeitraum eine begrenzte Ausfallzeit zu; die genaue Dauer hängt davon ab, ob Monat, Jahr und geplante Wartung mitgerechnet werden."],
  ["Warum sollten geplante Wartungsarbeiten vom Verfügbarkeitsbericht getrennt ausgewiesen werden?", "Damit Messung, SLA-Regeln und tatsächliche Ausfallwirkung transparent und nach vereinbarten Definitionen vergleichbar bleiben."],
  ["Wie wird ein Betriebsproblem nach einem erfolgreichen Workaround weiterbearbeitet?", "Den Vorfall nachvollziehbar schließen oder aktualisieren, Ursache und dauerhafte Korrektur als Problem beziehungsweise Änderung verfolgen und Betroffene informieren."],
];

const PROJECT_CARDS: [string, string][] = [
  ["Was gehört in eine belastbare Projektzielbeschreibung?", "Ausgangslage, messbares Ziel, Abgrenzung, erwarteter Nutzen, betroffene Beteiligte, wesentliche Anforderungen und überprüfbare Abnahmekriterien."],
  ["Wie werden Lösungsalternativen nachvollziehbar verglichen?", "Vorab Kriterien wie Funktion, Sicherheit, Betrieb, Kosten, Aufwand und Erweiterbarkeit festlegen, gewichten und jede Alternative mit denselben Annahmen bewerten."],
  ["Was ist der Unterschied zwischen Muss- und Kann-Anforderung?", "Muss-Anforderungen sind für die Abnahme zwingend. Kann-Anforderungen sind optionale Verbesserungen, die nur bei verfügbaren Ressourcen umgesetzt werden."],
  ["Warum sollte ein Projekt eine Stakeholderanalyse durchführen?", "Sie klärt Betroffene, Einfluss, Erwartungen und Informationsbedarf und hilft, Konflikte oder fehlende Freigaben früh zu erkennen."],
  ["Was ist ein kritischer Pfad?", "Die längste Abfolge voneinander abhängiger Vorgänge, die die minimale Projektdauer bestimmt. Verzögerungen auf diesem Pfad verzögern typischerweise den Endtermin."],
  ["Wie lässt sich ein Migrationsrisiko reduzieren?", "Abhängigkeiten aufnehmen, Pilotmigration durchführen, Daten sichern, Integrität prüfen, gestuft umstellen und einen getesteten Rückfallplan bereithalten."],
  ["Wann ist ein Pilotbetrieb sinnvoll?", "Wenn eine Lösung vor dem breiten Rollout mit repräsentativen Nutzenden, Lasten und Abläufen geprüft werden soll."],
  ["Was sollte ein Abnahmetest enthalten?", "Konkrete, prüfbare Kriterien, Testdaten, erwartete Ergebnisse, Verantwortlichkeiten und eine dokumentierte Entscheidung über Abweichungen."],
  ["Wie ist mit einer neuen Anforderung während der Umsetzung umzugehen?", "Änderung beschreiben, Auswirkungen auf Aufwand, Kosten, Termine und Risiken bewerten, Freigabe einholen und erst danach den Plan aktualisieren."],
  ["Was ist der Zweck eines Risikoregisters?", "Risiken mit Eintrittswahrscheinlichkeit, Auswirkung, Gegenmaßnahme, Verantwortlichkeit und Überwachung nachvollziehbar festzuhalten."],
  ["Wie kann die Wirtschaftlichkeit zweier Infrastrukturangebote verglichen werden?", "Gesamtkosten über einen einheitlichen Betrachtungszeitraum vergleichen: Anschaffung, Lizenzen, Betrieb, Energie, Wartung, Migration und Schulung."],
  ["Warum sollte ein Angebot auf Folgekosten geprüft werden?", "Niedrige Anschaffungskosten können durch Lizenzen, Support, Energie, Ersatzteile oder spätere Migration über die Nutzungsdauer deutlich übertroffen werden."],
  ["Was gehört in eine technische Projektdokumentation?", "Ziel, Architektur, Entscheidungen, Konfiguration, Tests, Betrieb, Sicherung/Wiederherstellung, bekannte Risiken und Übergabe an die zuständige Stelle."],
  ["Was sollte ein Übergabeprotokoll an den Betrieb enthalten?", "Systemverantwortung, Zugang über geregelte Konten, Betriebs- und Wiederanlaufanleitung, Monitoring, Sicherungen, Eskalationsweg und offene Punkte."],
  ["Wie wird ein Wartungsfenster für Nutzende planbar?", "Zeitpunkt, Auswirkung, betroffene Dienste, erwartete Dauer und Kontaktweg rechtzeitig kommunizieren und Änderungen anschließend bestätigen."],
  ["Wie lässt sich eine Rollback-Entscheidung vorbereiten?", "Vorab messbare Abbruchkriterien, maximale Ausfallzeit, gesicherte Ausgangsdaten, Verantwortlichkeiten und einen getesteten Rückweg festlegen."],
  ["Was sollte in einer Projektzeitschätzung enthalten sein?", "Arbeitspakete, Abhängigkeiten, Abstimmung, Test, Dokumentation, Übergabe und begründete Reserven für Unsicherheit."],
  ["Warum ist eine Bestandsaufnahme vor einem Netzwerkprojekt wichtig?", "Sie zeigt vorhandene Geräte, Adressbereiche, Abhängigkeiten, Versionen, Kapazitätsgrenzen und Risiken, die Planung und Migration beeinflussen."],
  ["Woran erkennt man ein gutes Projektziel?", "Es ist eindeutig, überprüfbar, zeitlich eingeordnet und beschreibt ein Ergebnis statt nur eine Tätigkeit."],
  ["Wie sollte eine Präsentation technischer Projektergebnisse aufgebaut sein?", "Auftrag und Ausgangslage, Anforderungen, begründete Lösung, Umsetzung, Prüfung, Ergebnis und wesentliche betriebliche Folgen in adressatengerechter Reihenfolge."],
  ["Was ist bei einer Nutzwertanalyse zu beachten?", "Kriterien und Gewichte müssen begründet sein, Bewertungen einheitlich erfolgen und das Ergebnis ist eine Entscheidungshilfe, kein objektiver Beweis."],
  ["Warum müssen Änderungen an der Produktivumgebung nachvollziehbar sein?", "Für Fehleranalyse, Verantwortlichkeit, Sicherheitsprüfung, Wiederholbarkeit und spätere Wartung."],
  ["Wie wird die Qualität einer Projektdokumentation geprüft?", "Anforderungen, Architektur, Konfiguration, Testnachweise und Übergabe abgleichen; eine andere fachkundige Person sollte zentrale Schritte nachvollziehen können."],
  ["Was bedeutet adressatengerechte Kommunikation im Projekt?", "Technische Details und Umfang werden an Vorwissen, Entscheidungsbedarf und Rolle der jeweiligen Zielgruppe angepasst."],
  ["Wie unterscheidet sich Projektumfang von Projektziel?", "Das Ziel beschreibt den erwarteten Nutzen oder Zustand; der Umfang legt fest, welche Leistungen enthalten und welche ausdrücklich ausgeschlossen sind."],
  ["Wozu dient ein Meilensteinplan?", "Er macht wichtige Ergebnisse und Entscheidungspunkte sichtbar, ohne jedes Arbeitspaket bis ins Detail abzubilden."],
  ["Wie kann ein Projekt mit knappen Ressourcen priorisieren?", "Pflichtanforderungen, Risiken, Abhängigkeiten und Nutzen transparent bewerten, Arbeit in abgestimmte Lieferstufen teilen und Änderungen freigeben lassen."],
  ["Was ist eine Abhängigkeit im Projektplan?", "Ein Arbeitsschritt kann erst beginnen oder abgeschlossen werden, wenn ein anderer definierter Vorgang ein Ergebnis geliefert hat."],
  ["Warum sollten Annahmen in einem Projektangebot dokumentiert werden?", "Ändern sich Voraussetzungen wie Mengen, Schnittstellen oder Lieferzeiten, lassen sich Auswirkungen auf Preis, Termin und Leistung nachvollziehbar bewerten."],
  ["Was ist ein Lastenheft?", "Es beschreibt aus Auftraggebersicht, was benötigt wird und welche Anforderungen eine Lösung erfüllen soll."],
  ["Was ist ein Pflichtenheft?", "Es beschreibt aus Auftragnehmersicht, wie die Anforderungen umgesetzt werden sollen und welche konkrete Lösung vorgesehen ist."],
  ["Wie sollte ein Projekt mit einer nicht bestandenen Abnahme umgehen?", "Abweichungen dokumentieren, Schwere und Ursache bewerten, Korrekturmaßnahmen mit Verantwortlichkeit und Termin planen und anschließend erneut prüfen."],
  ["Warum ist ein Testprotokoll wichtig?", "Es dokumentiert Umgebung, Testfall, Ergebnis, Abweichungen und Nachweis und macht die Prüfung später nachvollziehbar."],
  ["Wie lässt sich ein Risiko nach einer Gegenmaßnahme weiterverfolgen?", "Verantwortlichkeit, Frühindikatoren, verbleibende Auswirkung und Wiedervorlage festhalten und die Wirksamkeit der Maßnahme prüfen."],
  ["Was ist eine Eskalation im Projekt?", "Ein Problem wird an eine zuständige höhere oder fachlich passende Stelle gegeben, wenn Entscheidung oder Ressourcen außerhalb der eigenen Befugnis liegen."],
  ["Warum gehören Schulung und Kommunikation zur Einführung eines IT-Systems?", "Nutzende und Betrieb müssen Änderungen, neue Abläufe und Supportwege verstehen, damit die Lösung sicher und wirksam genutzt werden kann."],
  ["Welche Kosten gehören in eine Total-Cost-of-Ownership-Betrachtung?", "Anschaffung, Lizenzen, Integration, Energie, Personal, Wartung, Ausfallrisiko, Schulung, Migration und Außerbetriebnahme."],
  ["Was ist bei einer Lieferverzögerung eines kritischen Geräts zu tun?", "Auswirkung auf Abhängigkeiten und Terminplan ermitteln, Alternativen und Zwischenlösungen bewerten, Beteiligte informieren und Freigabe für Änderungen einholen."],
  ["Wie schützt eine gestufte Migration den Produktivbetrieb?", "Sie begrenzt den betroffenen Umfang, ermöglicht Lernen aus frühen Wellen und liefert Entscheidungspunkte für Fortsetzen, Anpassen oder Rückrollen."],
  ["Was sollte ein Wartungs- und Supportkonzept nach Projektabschluss festlegen?", "Zuständigkeiten, Reaktionsweg, Wartungsfenster, Monitoring, Eskalation, Sicherung und Pflege von Dokumentation und Konfiguration."],
  ["Wie kann ein Projekt die Einhaltung des Datenschutzes früh berücksichtigen?", "Zwecke und Datenflüsse erfassen, Rechtsgrundlage und Aufbewahrung klären, Zugriffsrechte minimieren und erforderliche Prüfungen vor der Umsetzung einplanen."],
  ["Was ist ein Change Advisory Board in einem IT-Serviceprozess?", "Ein Gremium, das geplante Änderungen anhand von Risiko, Nutzen, Auswirkungen und Ressourcen bewertet und eine Empfehlung zur Freigabe gibt."],
  ["Warum sollte ein Projektabschluss offene Restpunkte enthalten?", "Damit Verantwortliche, Priorität und Termin für nicht erledigte Arbeiten klar sind und diese nicht unbemerkt in den Betrieb übergehen."],
  ["Wozu dient eine Lessons-Learned-Runde?", "Sie sichert Erfahrungen zu Ursachen, Entscheidungen und Zusammenarbeit, damit künftige Projekte konkrete Verbesserungen ableiten können."],
];

const network = ihk(cards("net-konzept", "si-netzwerk", NETWORK_CARDS), NETWORK_SPECS);
const admin = ihk(cards("admin", "si-systeme", ADMIN_CARDS), ADMIN_SPECS);
const security = ihk(cards("security", "si-sicherheit", SECURITY_CARDS), SECURITY_SPECS);
const operations = ihk(cards("operations", "si-betrieb", OPERATIONS_CARDS), OPERATIONS_SPECS);
const project = ihk(cards("projekt", "si-projekt", PROJECT_CARDS), PROJECT_SPECS);

export const FISI_EXTRA: Question[] = [...legacySubnetQuestions(), ...subnetQuestions(), ...network, ...admin, ...security, ...operations, ...project, ...wisoQuestions()];
