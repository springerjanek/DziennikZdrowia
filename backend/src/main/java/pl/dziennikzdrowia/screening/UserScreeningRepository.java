package pl.dziennikzdrowia.screening;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserScreeningRepository extends JpaRepository<UserScreening, UUID> {

    // Cala historia badan uzytkownika, najnowsze pierwsze.
    List<UserScreening> findByUserIdOrderByPerformedOnDesc(UUID userId);

    // Wpis tylko, jesli nalezy do tego uzytkownika (usuwanie).
    Optional<UserScreening> findByIdAndUserId(UUID id, UUID userId);
}
