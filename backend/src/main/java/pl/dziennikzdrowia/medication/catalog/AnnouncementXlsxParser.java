package pl.dziennikzdrowia.medication.catalog;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Stream;

/**
 * Czyta załącznik XLSX do obwieszczenia MZ. Arkusze nazywają się jak części wykazu:
 * A1-A3 to leki, żywność specjalna i wyroby dostępne w aptece (z ceną i poziomem odpłatności),
 * D1/D2/E to listy bezpłatne dla uprawnionych (same GTIN-y).
 * Kolumny szukamy po nagłówkach, bo ich kolejność różni się między arkuszami.
 */
@Component
public class AnnouncementXlsxParser {

    private static final Logger log = LoggerFactory.getLogger(AnnouncementXlsxParser.class);

    private static final Set<String> PHARMACY_SHEETS = Set.of("A1", "A2", "A3");

    private static final Map<String, CatalogEntitlement.Code> ENTITLEMENT_SHEETS = Map.of(
            "D1", CatalogEntitlement.Code.S,
            "D2", CatalogEntitlement.Code.DZ,
            "E", CatalogEntitlement.Code.C);

    private static final int MAX_HEADER_ROW = 5;

    public ParsedAnnouncement parse(InputStream xlsx, LocalDate announcementDate) throws IOException {
        List<CatalogMedication> medications = new ArrayList<>();
        List<CatalogEntitlement> entitlements = new ArrayList<>();
        Map<String, Set<CatalogEntitlement.Code>> seen = new HashMap<>();

        try (ReadableWorkbook workbook = new ReadableWorkbook(xlsx)) {
            for (Sheet sheet : workbook.getSheets().toList()) {
                String name = sheet.getName().strip();
                if (PHARMACY_SHEETS.contains(name)) {
                    medications.addAll(readPharmacySheet(sheet, announcementDate));
                } else if (ENTITLEMENT_SHEETS.containsKey(name)) {
                    CatalogEntitlement.Code code = ENTITLEMENT_SHEETS.get(name);
                    for (String gtin : readGtins(sheet)) {
                        // W arkuszu GTIN może się powtarzać (kilka wskazań).
                        if (seen.computeIfAbsent(gtin, key -> EnumSet.noneOf(CatalogEntitlement.Code.class)).add(code)) {
                            entitlements.add(new CatalogEntitlement(gtin, code));
                        }
                    }
                }
            }
        }

        if (medications.isEmpty()) {
            throw new IOException("W pliku nie ma arkuszy A1-A3 z lekami");
        }
        return new ParsedAnnouncement(medications, entitlements);
    }

    private List<CatalogMedication> readPharmacySheet(Sheet sheet, LocalDate announcementDate) throws IOException {
        List<Row> rows = readRows(sheet);
        int headerIndex = findHeaderRow(rows);
        Row header = rows.get(headerIndex);

        int gtin = column(header, h -> h.startsWith("numer gtin"));
        int name = column(header, h -> h.startsWith("nazwa"));
        int substance = column(header, h -> h.equals("substancja czynna"));
        int pack = column(header, h -> h.equals("zawartość opakowania"));
        int retailPrice = column(header, h -> h.equals("cena detaliczna"));
        int level = column(header, h -> h.equals("poziom odpłatności"));
        int surcharge = column(header, h -> h.startsWith("wysokość dopłaty"));
        int indication = column(header, h -> h.equals("zakres wskazań objętych refundacją"));

        List<CatalogMedication> result = new ArrayList<>();
        int skipped = 0;
        for (Row row : rows.subList(headerIndex + 1, rows.size())) {
            String gtinValue = text(row, gtin);
            if (gtinValue.isEmpty()) {
                continue;
            }
            ReimbursementLevel levelValue = ReimbursementLevel.fromAnnouncement(text(row, level));
            if (levelValue == null) {
                skipped++;
                continue;
            }

            CatalogMedication medication = new CatalogMedication();
            medication.setGtin(gtinValue);
            medication.setName(truncate(text(row, name), 500));
            medication.setActiveSubstance(truncate(text(row, substance), 500));
            medication.setPackSize(truncate(text(row, pack), 200));
            medication.setLevel(levelValue);
            medication.setRetailPrice(money(text(row, retailPrice)));
            medication.setPatientSurcharge(money(text(row, surcharge)));
            medication.setIndication(truncate(text(row, indication), 4000));
            medication.setAnnouncementDate(announcementDate);
            result.add(medication);
        }

        if (skipped > 0) {
            log.warn("Arkusz {}: pominięto {} wierszy z nieznanym poziomem odpłatności", sheet.getName(), skipped);
        }
        return result;
    }

    private List<String> readGtins(Sheet sheet) throws IOException {
        List<Row> rows = readRows(sheet);
        int headerIndex = findHeaderRow(rows);
        int gtin = column(rows.get(headerIndex), h -> h.startsWith("numer gtin"));

        List<String> result = new ArrayList<>();
        for (Row row : rows.subList(headerIndex + 1, rows.size())) {
            String value = text(row, gtin);
            if (!value.isEmpty()) {
                result.add(value);
            }
        }
        return result;
    }

    private static List<Row> readRows(Sheet sheet) throws IOException {
        try (Stream<Row> rows = sheet.openStream()) {
            return rows.toList();
        }
    }

    private static int findHeaderRow(List<Row> rows) throws IOException {
        for (int i = 0; i < Math.min(rows.size(), MAX_HEADER_ROW); i++) {
            if (findColumn(rows.get(i), h -> h.startsWith("numer gtin")) >= 0) {
                return i;
            }
        }
        throw new IOException("Nie znaleziono wiersza nagłówka z kolumną GTIN");
    }

    private static int column(Row header, Predicate<String> matches) throws IOException {
        int index = findColumn(header, matches);
        if (index < 0) {
            throw new IOException("Brak oczekiwanej kolumny w wierszu nagłówka " + header.getRowNum());
        }
        return index;
    }

    private static int findColumn(Row header, Predicate<String> matches) {
        for (int i = 0; i < header.getCellCount(); i++) {
            if (matches.test(normalizeHeader(text(header, i)))) {
                return i;
            }
        }
        return -1;
    }

    // "Nazwa  postać i dawka" ma w oryginale podwójne spacje.
    static String normalizeHeader(String header) {
        return header.strip().replaceAll("\\s+", " ").toLowerCase();
    }

    private static String text(Row row, int index) {
        if (index >= row.getCellCount()) {
            return "";
        }
        return row.getCellText(index).strip();
    }

    /** Ceny w obwieszczeniu mają przecinek dziesiętny: "19,05". */
    static BigDecimal money(String value) {
        String normalized = value.replace(" ", "").replace(',', '.');
        if (normalized.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String truncate(String value, int maxLength) {
        if (value.isEmpty()) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
