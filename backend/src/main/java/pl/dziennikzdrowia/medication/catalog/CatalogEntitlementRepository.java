package pl.dziennikzdrowia.medication.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CatalogEntitlementRepository extends JpaRepository<CatalogEntitlement, Long> {
}
