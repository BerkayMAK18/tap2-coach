export const SQL_SEED = `
CREATE TABLE Kunde(KID INTEGER PRIMARY KEY, Name TEXT, Ort TEXT, Email TEXT);
CREATE TABLE Artikel(ArtNr INTEGER PRIMARY KEY, Bezeichnung TEXT, Kategorie TEXT, Preis REAL);
CREATE TABLE Bestellung(BID INTEGER PRIMARY KEY, KID INTEGER REFERENCES Kunde(KID), Datum TEXT, Status TEXT);
CREATE TABLE Position(BID INTEGER REFERENCES Bestellung(BID), ArtNr INTEGER REFERENCES Artikel(ArtNr), Menge INTEGER, PRIMARY KEY(BID,ArtNr));
INSERT INTO Kunde VALUES(1,'Ada','Berlin','ada@example.test'),(2,'Linus','Hamburg','linus@example.test'),(3,'Grace','Berlin','grace@example.test');
INSERT INTO Artikel VALUES(1,'Tastatur','Zubehör',49.90),(2,'Monitor','Bildschirm',199.00),(3,'Maus','Zubehör',25.00);
INSERT INTO Bestellung VALUES(1,1,'2026-11-01','offen'),(2,2,'2026-11-02','versendet'),(3,1,'2026-11-03','versendet');
INSERT INTO Position VALUES(1,1,2),(1,2,1),(2,3,4),(3,2,2);`;
export const PRACTICE = {
  python: [
    { title: 'Messwerte zählen', task: 'Schreibe zaehle_ueber(werte, grenze). Zähle die Werte strikt oberhalb der Grenze. Prüfe auch eine leere Liste und negative Werte.', code: 'def zaehle_ueber(werte, grenze):\n    # Ergänze deinen Algorithmus\n    return 0\n\nprint(zaehle_ueber([12, 20, 21, 30], 20))\n', solution: 'def zaehle_ueber(werte, grenze):\n    anzahl = 0\n    for wert in werte:\n        if wert > grenze:\n            anzahl += 1\n    return anzahl\n\nassert zaehle_ueber([12, 20, 21, 30], 20) == 2\nassert zaehle_ueber([], 20) == 0\nassert zaehle_ueber([-5, -2], -3) == 1\nprint("Alle Tests bestanden")' },
    { title: 'Bubble Sort', task: 'Sortiere eine Liste aufsteigend, ohne sort() oder sorted(). Begründe danach die Schleifengrenzen und O(n²).', code: 'def bubble_sort(werte):\n    return werte\n\nprint(bubble_sort([5, 1, 3, 1]))', solution: 'def bubble_sort(werte):\n    a = list(werte)\n    for i in range(len(a) - 1):\n        for j in range(len(a) - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a\n\nassert bubble_sort([5,1,3,1]) == [1,1,3,5]\nassert bubble_sort([]) == []\nprint("Alle Tests bestanden")' },
    { title: 'Objekte und Tests', task: 'Implementiere Konto mit einzahlen und abheben. Verhindere negative Beträge und Überziehung. Schreibe Grenzwerttests.', code: 'class Konto:\n    def __init__(self):\n        self.saldo = 0\n\nkonto = Konto()\nprint(konto.saldo)', solution: 'class Konto:\n    def __init__(self):\n        self.saldo = 0\n    def einzahlen(self, betrag):\n        if betrag < 0:\n            raise ValueError("Negativer Betrag")\n        self.saldo += betrag\n    def abheben(self, betrag):\n        if betrag < 0 or betrag > self.saldo:\n            raise ValueError("Abhebung nicht möglich")\n        self.saldo -= betrag\n\nk = Konto()\nk.einzahlen(10)\nk.abheben(10)\nassert k.saldo == 0\nprint("Grenzwerttest bestanden")' },
  ],
  sql: [
    { title: 'Filtern und sortieren', task: 'Zeige Name und Ort der Kunden aus Berlin, aufsteigend nach Name sortiert.', code: 'SELECT * FROM Kunde;', solution: "SELECT Name, Ort FROM Kunde WHERE Ort = 'Berlin' ORDER BY Name;" },
    { title: 'JOIN und Umsatz', task: 'Berechne den Umsatz je Kunde aus Positionen und Artikelpreisen. Zeige auch Kunden ohne Bestellung (Umsatz 0).', code: 'SELECT * FROM Bestellung;', solution: 'SELECT k.Name, COALESCE(SUM(p.Menge * a.Preis), 0) AS Umsatz\nFROM Kunde k\nLEFT JOIN Bestellung b ON b.KID = k.KID\nLEFT JOIN Position p ON p.BID = b.BID\nLEFT JOIN Artikel a ON a.ArtNr = p.ArtNr\nGROUP BY k.KID, k.Name;' },
    { title: 'GROUP BY und HAVING', task: 'Zeige nur Kunden mit mindestens 2 Bestellungen. Gib Name und Anzahl aus.', code: 'SELECT * FROM Kunde;', solution: 'SELECT k.Name, COUNT(b.BID) AS Anzahl\nFROM Kunde k JOIN Bestellung b ON b.KID = k.KID\nGROUP BY k.KID, k.Name\nHAVING COUNT(b.BID) >= 2;' },
  ],
};