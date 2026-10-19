package pl.dziennikzdrowia.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String googleSub;

    @Column(nullable = false)
    private String email;

    private String name;

    @Column(length = 2048)
    private String pictureUrl;

    // Dwa niezapisane obiekty (id == null) nigdy nie sa rowne.
    // getId() zamiast pola, bo `o` moze byc proxy Hibernate.
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof User other)) {
            return false;
        }
        return id != null && id.equals(other.getId());
    }

    // Stala wartosc, zeby hashCode nie zmienial sie po zapisie, gdy pojawi sie id.
    @Override
    public int hashCode() {
        return User.class.hashCode();
    }

}
