package pl.dziennikzdrowia.medication.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Lek bezpłatny dla grupy uprawnionej (załączniki D1, D2, E obwieszczenia).
 * Jeden wiersz na parę GTIN + kod.
 */
@Entity
@Table(name = "catalog_entitlements", indexes = @Index(columnList = "gtin"))
@Getter
@Setter
@NoArgsConstructor
public class CatalogEntitlement {

    public enum Code {
        // 65+ (art. 43a ust. 1 pkt 1 ustawy o świadczeniach), załącznik D1.
        S,
        // Do 18 lat (art. 43a ust. 1 pkt 2), załącznik D2.
        DZ,
        // Ciąża (art. 43b), załącznik E.
        C
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 14)
    private String gtin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private Code code;

    public CatalogEntitlement(String gtin, Code code) {
        this.gtin = gtin;
        this.code = code;
    }
}
