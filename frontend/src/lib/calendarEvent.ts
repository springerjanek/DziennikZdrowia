type Reminder = {
  title: string;
  description: string;
  day: string;
};

// RFC 5545: przecinek, srednik, odwrotny ukosnik i nowa linia musza byc
// poprzedzone ukosnikiem, inaczej kalendarz rozjedzie pola.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Wydarzenie calodniowe w pliku .ics. Kalendarz jest tu lepszy niz
 * powiadomienie w aplikacji: dziala, gdy strona jest zamknieta, i zostaje na
 * telefonie uzytkownika, a my nie przechowujemy niczego o jego lekach.
 */
export function buildIcs(reminder: Reminder): string {
  const day = reminder.day.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dziennik Zdrowia//PL",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@dziennikzdrowia`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;VALUE=DATE:${day}`,
    `SUMMARY:${escapeText(reminder.title)}`,
    `DESCRIPTION:${escapeText(reminder.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Konce linii musza byc CRLF - czesc kalendarzy odrzuca plik z samym LF.
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(fileName: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
