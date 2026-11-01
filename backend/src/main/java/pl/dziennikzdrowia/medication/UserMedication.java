package pl.dziennikzdrowia.medication;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pl.dziennikzdrowia.user.User;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Lek, który przyjmuje użytkownik, z harmonogramem. GTIN wskazuje pozycję w wykazie MZ
 * (refundacja jest liczona na bieżąco z katalogu); lek dodany ręcznie ma tylko nazwę.
 */
@Entity
@Table(name = "user_medications")
@Getter
@Setter
@NoArgsConstructor
public class UserMedication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 14)
    private String gtin;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(length = 500)
    private String activeSubstance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScheduleType scheduleType;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_medication_weekdays", joinColumns = @JoinColumn(name = "user_medication_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "weekday", length = 10)
    private Set<DayOfWeek> weekdays = EnumSet.noneOf(DayOfWeek.class);

    private Integer intervalDays;

    // Dla AS_NEEDED: ile razy najwyżej na dobę.
    private Integer maxDailyDoses;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 1000)
    private String notes;

    @OneToMany(mappedBy = "userMedication", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("time ASC")
    private List<MedicationDose> doses = new ArrayList<>();

    public void replaceDoses(List<MedicationDose> newDoses) {
        doses.clear();
        for (MedicationDose dose : newDoses) {
            dose.setUserMedication(this);
            doses.add(dose);
        }
    }

    // Jak w User: równość po id, stały hashCode.
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserMedication other)) {
            return false;
        }
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return UserMedication.class.hashCode();
    }
}
