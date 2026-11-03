package pl.dziennikzdrowia.screening;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Jeden przedzial czestotliwosci: od wieku ageFrom badanie powtarza sie co intervalMonths miesiecy.
 * Regula moze miec kilka przedzialow, np. Moje Zdrowie: od 20 lat co 60 mies., od 50 lat co 36 mies.
 * Obowiazuje przedzial z najwiekszym ageFrom, ktory jest <= wiek pacjenta.
 */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AgeBand {

    @Column(name = "age_from", nullable = false)
    private int ageFrom;

    @Column(name = "interval_months", nullable = false)
    private int intervalMonths;
}
