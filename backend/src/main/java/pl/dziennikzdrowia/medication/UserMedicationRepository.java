package pl.dziennikzdrowia.medication;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserMedicationRepository extends JpaRepository<UserMedication, UUID> {

    @EntityGraph(attributePaths = "doses")
    List<UserMedication> findByUserIdOrderByName(UUID userId);

    @EntityGraph(attributePaths = "doses")
    Optional<UserMedication> findByIdAndUserId(UUID id, UUID userId);
}
