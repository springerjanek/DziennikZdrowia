package pl.dziennikzdrowia.screening;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import pl.dziennikzdrowia.user.User;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Badanie wykonane przez uzytkownika. Na tej podstawie liczymy nastepny termin:
 * ostatnie performedOn + intervalMonths dla obecnego wieku.
 * Nastepnego terminu nie zapisujemy, zeby nie rozjechal sie po zmianie reguly albo po urodzinach.
 */
@Entity
@Table(name = "user_screening",
        indexes = @Index(name = "idx_user_screening_user_rule", columnList = "user_id, rule_id"))
@Getter
@Setter
@NoArgsConstructor
public class UserScreening {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rule_id", nullable = false)
    private ScreeningRule rule;

    @Column(nullable = false)
    private LocalDate performedOn;

    @Column(length = 1000)
    private String notes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // Jak w User: dwa niezapisane obiekty nigdy nie sa rowne, hashCode staly.
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserScreening other)) {
            return false;
        }
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return UserScreening.class.hashCode();
    }
}
