package pl.dziennikzdrowia.medication.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Wiersz wykazu leków refundowanych (załącznik A1-A3 obwieszczenia MZ).
 * Ten sam GTIN może wystąpić kilka razy: osobno dla każdego wskazania z innym poziomem odpłatności.
 * Tabela jest w całości podmieniana przy imporcie nowego obwieszczenia.
 */
@Entity
@Table(name = "catalog_medications", indexes = @Index(columnList = "gtin"))
@Getter
@Setter
@NoArgsConstructor
public class CatalogMedication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 14)
    private String gtin;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(length = 500)
    private String activeSubstance;

    @Column(length = 200)
    private String packSize;

    // Kod ATC z Rejestru Produktów Leczniczych (obwieszczenie go nie ma). Null dla wyrobów medycznych i diet.
    // Leki złożone mają kilka kodów po przecinku ("L01BA01, L04AX03"); najdłuższy w RPL ma ok. 80 znaków.
    @Column(length = 255)
    private String atc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReimbursementLevel level;

    @Column(precision = 12, scale = 2)
    private BigDecimal retailPrice;

    // Ile pacjent dopłaca przy refundacji (bez uprawnień S/DZ/C).
    @Column(precision = 12, scale = 2)
    private BigDecimal patientSurcharge;

    @Column(length = 4000)
    private String indication;

    // Data wejścia w życie obwieszczenia, z którego pochodzi wiersz.
    @Column(nullable = false)
    private LocalDate announcementDate;
}
