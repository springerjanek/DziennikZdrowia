package pl.dziennikzdrowia.medication.catalog;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RplAtcClientTest {

    // Skrócony fragment prawdziwego eksportu: ";" jako separator, opakowania w kilku liniach w jednym polu.
    private static final String HEADER = "\uFEFF\"Identyfikator Produktu Leczniczego\";\"Nazwa Produktu Leczniczego\";"
            + "\"Kod ATC\";\"Podmiot odpowiedzialny\";\"Opakowanie\";\"Substancja czynna\"\r\n";

    @Test
    void mapsEveryPackageGtinToProductAtc() throws IOException {
        String csv = HEADER
                + "\"100000014\";\"Zoledronic acid Fresenius Kabi\";\"M05BA08\";\"Fresenius Kabi Polska Sp. z o.o.\";"
                + "\"05909991023652 ¦ Rpz ¦ 2\n1 fiol. 5 ml\n05909991023669 ¦ Rpz ¦ 3\n4 fiol. 5 ml\";\"Acidum zoledronicum\"\r\n"
                + "\"100000015\";\"Euthyrox N 50\";\"H03AA01\";\"Merck \"\"Polska\"\"; oddział\";"
                + "\"5909990000005 ¦ Rp ¦ 1\n50 tabl.\";\"Levothyroxinum natricum\"\r\n";

        assertThat(RplAtcClient.parse(new StringReader(csv)))
                .containsEntry("05909991023652", "M05BA08")
                .containsEntry("05909991023669", "M05BA08")
                // 13-cyfrowy kod dostaje wiodące zero jak w wykazie; cudzysłów i ";" w polu nie psują kolumn.
                .containsEntry("05909990000005", "H03AA01")
                .hasSize(3);
    }

    @Test
    void skipsProductsWithoutAtcAndGtinsWithConflictingCodes() throws IOException {
        String csv = HEADER
                + "\"1\";\"Bez kodu\";\"\";\"X\";\"05900000000001 ¦ OTC ¦ 1\n10 szt.\";\"\"\r\n"
                + "\"2\";\"Ketoprofen\";\"M01AE03\";\"X\";\"05900000000002 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n"
                + "\"3\";\"Ketoprofen krople\";\"S01BC09\";\"X\";\"05900000000002 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n"
                + "\"4\";\"Ten sam kod dwa razy\";\"A10BA02\";\"X\";\"05900000000003 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n"
                + "\"5\";\"Ten sam kod dwa razy\";\"A10BA02\";\"X\";\"05900000000003 ¦ Rp ¦ 1\n1 szt.\";\"\"";

        assertThat(RplAtcClient.parse(new StringReader(csv)))
                .containsOnlyKeys("05900000000003")
                .containsEntry("05900000000003", "A10BA02");
    }

    @Test
    void keepsAllCodesOfCombinationProductsWithoutDuplicates() throws IOException {
        String csv = HEADER
                + "\"1\";\"Trexan Neo\";\"L01BA01, L04AX03\";\"X\";\"05900000000004 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n"
                + "\"2\";\"Olanzapine Apotex\";\" N05AH03,N05AH03 \";\"X\";\"05900000000005 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n";

        assertThat(RplAtcClient.parse(new StringReader(csv)))
                .containsEntry("05900000000004", "L01BA01, L04AX03")
                .containsEntry("05900000000005", "N05AH03");
    }

    @Test
    void failsWhenExportFormatChanged() {
        assertThatThrownBy(() -> RplAtcClient.parse(new StringReader("\"Nazwa\";\"ATC\"\n\"A\";\"B\"\n")))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("Kod ATC");
        assertThatThrownBy(() -> RplAtcClient.parse(new StringReader("")))
                .isInstanceOf(IOException.class);
    }

    @Test
    void failsOnBrokenCsvInsteadOfSwallowingTheRest() {
        // Niezamknięty cudzysłów: zamiast po cichu wciągnąć resztę pliku do jednego pola, import ma się wywrócić.
        String csv = HEADER
                + "\"1\";\"Zepsuty\";\"A10BA02\";\"X\";\"05900000000006 ¦ Rp ¦ 1\n1 szt.;\"\"\r\n"
                + "\"2\";\"Siofor\";\"A10BA02\";\"X\";\"05900000000007 ¦ Rp ¦ 1\n1 szt.\";\"\"\r\n";

        assertThatThrownBy(() -> RplAtcClient.parse(new StringReader(csv)))
                .isInstanceOfAny(IOException.class, java.io.UncheckedIOException.class);
    }
}
