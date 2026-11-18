import type { Question } from "../schema";
import { karten, mcs, type Karte, type Mc } from "./helpers";

const T = "si-adressierung";
const toNum = (ip: string) => ip.split(".").reduce((n, o) => ((n << 8) | Number(o)) >>> 0, 0);
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const mask = (p: number) => (0xffffffff << (32 - p)) >>> 0;
const net = (a: number, p: number) => (a & mask(p)) >>> 0;
const size = (p: number) => 2 ** (32 - p);
const hosts = (p: number) => size(p) - 2;
const bc = (n: number, p: number) => (n + size(p) - 1) >>> 0;
const u = (n: number) => n >>> 0;

const CASES: [string, number][] = [
  ["192.168.10.77", 26], ["192.168.10.201", 27], ["192.168.10.41", 28], ["172.20.5.201", 23],
  ["172.20.7.88", 22], ["10.44.19.201", 21], ["10.44.25.77", 20], ["172.19.88.44", 19],
  ["192.168.144.19", 20], ["192.168.152.211", 21], ["10.200.5.99", 22], ["172.30.18.221", 23],
  ["192.168.50.139", 25], ["192.168.50.46", 27], ["10.1.2.137", 25], ["10.1.3.210", 26],
  ["172.16.8.33", 28], ["172.16.8.14", 29], ["192.168.70.130", 26], ["10.90.6.211", 23],
  ["172.22.40.201", 22], ["192.168.100.198", 25], ["10.15.31.241", 28], ["10.77.30.129", 22],
];

const hostMc: Mc[] = CASES.map(([ip, p]) => {
  const n = net(toNum(ip), p), s = size(p), b = bc(n, p);
  return [`Das Subnetz ${toIp(n)}/${p} wird eingerichtet. Welche Adresse kann einem Host zugewiesen werden?`, toIp(u(n + Math.max(2, s >> 2))), [toIp(n), toIp(b), toIp(u(n + s))],
    `Nutzbar sind nur Adressen von ${toIp(u(n + 1))} bis ${toIp(u(b - 1))}. Netzadresse und Broadcast sind reserviert, ${toIp(u(n + s))} liegt bereits im nächsten Subnetz.`];
});

const prefixes = Array.from({ length: 14 }, (_, i) => 16 + i);
const maskMc: Mc[] = prefixes.map((p) => [
  `Welche Subnetzmaske und wie viele nutzbare Hostadressen gehören zum Präfix /${p}?`,
  `${toIp(mask(p))}, ${hosts(p)} Hosts`,
  [`${toIp(mask(p + 1))}, ${hosts(p)} Hosts`, `${toIp(mask(p))}, ${size(p)} Hosts`, `${toIp(mask(p - 1))}, ${hosts(p + 1)} Hosts`],
  `/${p} setzt ${p} Bits auf 1 (${toIp(mask(p))}). Es bleiben ${32 - p} Hostbits: 2^${32 - p} − 2 = ${hosts(p)} nutzbare Adressen.`,
]);

const reverseMc: Mc[] = prefixes.slice(1).map((p) => [
  `Ein Router zeigt die Subnetzmaske ${toIp(mask(p))}. Wie lautet die CIDR-Schreibweise dazu?`,
  `/${p}`, [`/${p - 1}`, `/${p + 1}`, `/${p + 2}`], `Die Maske hat ${p} gesetzte Bits, also /${p}.`,
]);

const NEEDS: [string, number][] = [
  ["Vertrieb", 25], ["Buchhaltung", 30], ["Entwicklung", 60], ["Lager", 62], ["Support", 63], ["Schulung", 100], ["Gäste-WLAN", 120],
  ["Produktion", 126], ["Verwaltung", 127], ["Druckerpool", 12], ["Telefonie", 14], ["Management", 5], ["Server-DMZ", 29], ["Labor", 200],
  ["IoT-Sensorik", 250], ["Außenstelle", 45], ["Backoffice", 90], ["Rechenzentrum", 500], ["Campus-WLAN", 1000], ["VPN-Pool", 2000],
];
const needPrefix = (n: number) => { let h = 1; while (2 ** h - 2 < n) h++; return 32 - h; };
const needMc: Mc[] = NEEDS.map(([name, n]) => {
  const p = needPrefix(n);
  return [`Die Abteilung ${name} benötigt ${n} Hostadressen (Gateway und Reserve sind bereits eingerechnet). Welches ist das kleinste passende Präfix?`, `/${p}`, [`/${p + 1}`, `/${p - 1}`, `/${p + 2}`],
    `Ein /${p} bietet ${hosts(p)} nutzbare Adressen, ein /${p + 1} nur ${hosts(p + 1)} und reicht für ${n} nicht. Ein /${p - 1} wäre unnötig groß.`];
});

const SPLITS: [string, number, number, number][] = [
  ["192.168.0.0", 24, 4, 3], ["192.168.20.0", 24, 8, 5], ["192.168.30.0", 24, 2, 2], ["192.168.40.0", 24, 16, 11], ["10.0.0.0", 16, 4, 4], ["10.10.0.0", 16, 8, 3],
  ["10.20.0.0", 20, 4, 2], ["172.16.0.0", 16, 16, 9], ["172.16.32.0", 20, 4, 3], ["192.168.100.0", 24, 4, 2], ["192.168.110.0", 24, 8, 8], ["10.50.0.0", 22, 4, 3],
  ["10.60.0.0", 21, 8, 6], ["172.20.0.0", 22, 2, 2], ["10.30.64.0", 18, 4, 2], ["172.28.0.0", 19, 8, 7], ["192.168.200.0", 25, 4, 3], ["192.168.210.128", 25, 2, 2],
];
const splitCards: Karte[] = SPLITS.map(([base, p, k, nth]) => {
  const bits = Math.log2(k), np = p + bits, n = u(toNum(base) + (nth - 1) * size(np)), b = bc(n, np);
  return [`Das Netz ${base}/${p} soll in ${k} gleich große Subnetze geteilt werden.`, `Berechnen Sie für das ${nth}. Subnetz Präfix, Netzadresse, Broadcast-Adresse und die Zahl nutzbarer Hosts.`, 4, [
    `Neues Präfix /${np} (${bits} zusätzliche Bits für ${k} Subnetze)`, `Netzadresse ${toIp(n)} (${nth - 1} × Blockgröße ${size(np)} zur Basis)`, `Broadcast-Adresse ${toIp(b)}`, `${hosts(np)} nutzbare Hosts`,
  ]];
});

// Die ersten 74 Rechenkarten (fisi:card:cidr-net-NN) und Netzadress-Fragen (fisi:mc:cidr-network-NN) bleiben in fisi-bank.ts, damit der Lernfortschritt erhalten bleibt.
export const subnetQuestions = (): Question[] => [
  ...mcs("sub-host", T, hostMc), ...mcs("sub-maske", T, maskMc), ...mcs("sub-praefix", T, reverseMc), ...mcs("sub-bedarf", T, needMc), ...karten("sub-teilung", T, splitCards),
];
