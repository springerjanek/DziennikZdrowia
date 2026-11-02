package pl.dziennikzdrowia.medication.catalog;

import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/** Mały XLSX z tymi samymi nagłówkami co prawdziwy załącznik (stan na obwieszczenie 84W). */
class AnnouncementXlsxParserTest {

    private static final LocalDate ANNOUNCEMENT = LocalDate.of(2026, 10, 1);

    private static final List<String> A1_HEADER = List.of(
            "LP", "Substancja czynna", "Nazwa  postać i dawka", "Zawartość opakowania",
            "Numer GTIN lub inny kod jednoznacznie identyfikujący produkt", "Termin wejścia w życie decyzji",
            "Okres obowiązywania decyzji", "Grupa limitowa", "Cena zbytu netto", "Urzędowa cena zbytu",
            "Cena hurtowa brutto", "Cena detaliczna", "Wysokość limitu finansowania",
            "Zakres wskazań objętych refundacją", "Zakres wskazań pozarejestracyjnych objętych refundacją",
            "Poziom odpłatności", "Wysokość dopłaty świadczeniobiorcy");

    private static final List<String> D_HEADER = List.of(
            "LP", "Substancja czynna", "Nazwa i postać leku", "Zawartość opakowania",
            "Numer GTIN lub inny kod jednoznacznie identyfikujący produkt");

    private final AnnouncementXlsxParser parser = new AnnouncementXlsxParser();

    @Test
    void readsPharmacyRowsAndEntitlements() throws IOException {
        byte[] xlsx = workbook(
                new SheetData("A1", A1_HEADER, List.of(
                        a1Row("Acarbosum", "Adeksa, tabl., 100 mg", "05909990893423", "19,05", "Cukrzyca", "30%", "5,15"),
                        a1Row("Sorbalgon", "Sorbalgon Classic", "06940610109899", "10,94", "Owrzodzenia", "30%", "4,17"),
                        a1Row("Sorbalgon", "Sorbalgon Classic", "06940610109899", "10,94", "EB", "bezpłatny do limitu", "1,27"),
                        a1Row("X", "Nieznany", "05900000000001", "1,00", "", "75%", "0,75"),
                        a1Row("", "", "", "", "", "", ""))),
                new SheetData("B", D_HEADER, List.of(List.of("1", "Abemaciclibum", "Verzenios", "70 szt.", "05014602500986"))),
                new SheetData("D1", D_HEADER, List.of(dRow("05909990893423"))),
                new SheetData("D2", D_HEADER, List.of(dRow("05909990893423"), dRow("05909990893423"))),
                new SheetData("E", D_HEADER, List.of(dRow("06940610109899"))));

        ParsedAnnouncement parsed = parser.parse(new ByteArrayInputStream(xlsx), ANNOUNCEMENT);

        // Wiersz z nieznanym poziomem i pusty wiersz są pomijane, arkusz B (programy lekowe) też.
        assertThat(parsed.medications())
                .extracting(CatalogMedication::getGtin, CatalogMedication::getLevel, CatalogMedication::getIndication)
                .containsExactly(
                        tuple("05909990893423", ReimbursementLevel.P30, "Cukrzyca"),
                        tuple("06940610109899", ReimbursementLevel.P30, "Owrzodzenia"),
                        tuple("06940610109899", ReimbursementLevel.FREE, "EB"));

        CatalogMedication adeksa = parsed.medications().getFirst();
        assertThat(adeksa.getName()).isEqualTo("Adeksa, tabl., 100 mg");
        assertThat(adeksa.getActiveSubstance()).isEqualTo("Acarbosum");
        assertThat(adeksa.getPackSize()).isEqualTo("30 szt.");
        assertThat(adeksa.getRetailPrice()).isEqualByComparingTo(new BigDecimal("19.05"));
        assertThat(adeksa.getPatientSurcharge()).isEqualByComparingTo(new BigDecimal("5.15"));
        assertThat(adeksa.getAnnouncementDate()).isEqualTo(ANNOUNCEMENT);

        // Powtórzony GTIN w D2 daje jedno uprawnienie.
        assertThat(parsed.entitlements())
                .extracting(CatalogEntitlement::getGtin, CatalogEntitlement::getCode)
                .containsExactly(
                        tuple("05909990893423", CatalogEntitlement.Code.S),
                        tuple("05909990893423", CatalogEntitlement.Code.DZ),
                        tuple("06940610109899", CatalogEntitlement.Code.C));
    }

    @Test
    void failsWhenThereAreNoPharmacySheets() throws IOException {
        byte[] xlsx = workbook(new SheetData("D1", D_HEADER, List.of(dRow("05909990893423"))));

        assertThatThrownBy(() -> parser.parse(new ByteArrayInputStream(xlsx), ANNOUNCEMENT))
                .isInstanceOf(IOException.class);
    }

    @Test
    void failsWhenColumnIsMissing() throws IOException {
        byte[] xlsx = workbook(new SheetData("A1", A1_HEADER.subList(0, 12), List.of()));

        assertThatThrownBy(() -> parser.parse(new ByteArrayInputStream(xlsx), ANNOUNCEMENT))
                .isInstanceOf(IOException.class);
    }

    @Test
    void parsesPolishDecimals() {
        assertThat(AnnouncementXlsxParser.money("1 234,50")).isEqualByComparingTo("1234.50");
        assertThat(AnnouncementXlsxParser.money("0")).isEqualByComparingTo("0");
        assertThat(AnnouncementXlsxParser.money("")).isNull();
        assertThat(AnnouncementXlsxParser.money("brak")).isNull();
    }

    private record SheetData(String name, List<String> header, List<List<String>> rows) {
    }

    private static List<String> a1Row(String substance, String name, String gtin, String retailPrice,
                                      String indication, String level, String surcharge) {
        return List.of("1", substance, name, "30 szt.", gtin, "2024-07-01", "3 lata", "17.0, Grupa",
                "12,30", "13,28", "14,08", retailPrice, "19,05", indication, "", level, surcharge);
    }

    private static List<String> dRow(String gtin) {
        return List.of("1", "Substancja", "Lek, tabl.", "30 szt.", gtin);
    }

    private static byte[] workbook(SheetData... sheets) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Workbook workbook = new Workbook(out, "test", "1.0");
        for (SheetData sheet : sheets) {
            Worksheet worksheet = workbook.newWorksheet(sheet.name());
            // Pierwszy wiersz to tytuł części wykazu, nagłówek jest w drugim.
            worksheet.value(0, 0, sheet.name() + ". Tytuł części wykazu");
            writeRow(worksheet, 1, sheet.header());
            for (int i = 0; i < sheet.rows().size(); i++) {
                writeRow(worksheet, i + 2, sheet.rows().get(i));
            }
        }
        workbook.finish();
        return out.toByteArray();
    }

    private static void writeRow(Worksheet worksheet, int row, List<String> values) {
        for (int column = 0; column < values.size(); column++) {
            if (!values.get(column).isEmpty()) {
                worksheet.value(row, column, values.get(column));
            }
        }
    }
}
