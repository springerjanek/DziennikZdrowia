package pl.dziennikzdrowia.medication;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

/** Jedna pora przyjmowania leku; każda pora może mieć inną dawkę. */
@Entity
@Table(name = "medication_doses")
@Getter
@Setter
@NoArgsConstructor
public class MedicationDose {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_medication_id")
    private UserMedication userMedication;

    // null tylko dla ScheduleType.AS_NEEDED.
    @Column(name = "time_of_day")
    private LocalTime time;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DoseUnit unit;

    // Np. "po posiłku", "na czczo".
    @Column(length = 200)
    private String instruction;
}
