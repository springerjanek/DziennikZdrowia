package pl.dziennikzdrowia.medication.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CatalogMedicationRepository extends JpaRepository<CatalogMedication, Long> {

    List<CatalogMedication> findByGtinIn(Collection<String> gtins);

    @Query("select distinct m.name from CatalogMedication m where lower(m.name) like :pattern escape '\\'")
    List<String> findNamesLike(@Param("pattern") String pattern);

    @Query("select max(m.announcementDate) from CatalogMedication m")
    Optional<LocalDate> findCurrentAnnouncementDate();

    boolean existsByAtcIsNotNull();

    @Query("select e from CatalogEntitlement e where e.gtin in :gtins")
    List<CatalogEntitlement> findEntitlements(@Param("gtins") Collection<String> gtins);

    @Modifying
    @Query("delete from CatalogEntitlement")
    void deleteAllEntitlements();
}
