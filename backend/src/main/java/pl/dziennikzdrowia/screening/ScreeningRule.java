package pl.dziennikzdrowia.screening;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pl.dziennikzdrowia.user.Sex;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Regula profilaktyczna z katalogu (slownik wspolny dla wszystkich uzytkownikow).
 * Zrodlem prawdy jest plik screening-rules.json - ScreeningRuleLoader synchronizuje go z baza przy starcie.
 * Ksztalt odpowiada ScreeningRule z frontend/src/domain/screening.ts.
 */
@Entity
@Table(name = "screening_rule")
@Getter
@Setter
@NoArgsConstructor
public class ScreeningRule {

    // Czytelne id nadawane w JSON-ie ('mammography'), takie samo jak na froncie.
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false, length = 1000)
    private String rationale;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RuleSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AgeBasis ageBasis;

    // null = obie plcie.
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Sex sex;

    // null = bez dolnej / gornej granicy wieku.
    private Integer ageFrom;

    private Integer ageTo;

    // Nazwa swiadczenia w API Terminy Leczenia NFZ (do wyszukiwania placowek), jesli jest.
    @Column(length = 100)
    private String nfzBenefit;

    // Skad wzieta regula i kiedy ostatnio sprawdzona - programy NFZ zmieniaja sie co jakis czas.
    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDate verifiedAt;

    // Regule usunieta z JSON-a wylaczamy zamiast kasowac, bo moze byc w historii badan uzytkownikow.
    @Column(nullable = false)
    private boolean active = true;

    // Czestotliwosc zalezna od wieku. Malo danych, a reguly zawsze potrzebne razem z przedzialami - EAGER.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "screening_rule_interval", joinColumns = @JoinColumn(name = "rule_id"))
    @OrderBy("ageFrom ASC")
    private List<AgeBand> intervals = new ArrayList<>();

    // Regula dotyczy tylko osob z ktoraskolwiek z tych chorob (id jak ChronicConditionId na froncie).
    // Pusty zbior = regula dla wszystkich.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "screening_rule_condition", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "condition_id", nullable = false, length = 50)
    private Set<String> anyCondition = new HashSet<>();

    // Id nadajemy sami przed zapisem, wiec mozna po nim porownywac.
    // getId() zamiast pola, bo `o` moze byc proxy Hibernate.
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ScreeningRule other)) {
            return false;
        }
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return ScreeningRule.class.hashCode();
    }
}
