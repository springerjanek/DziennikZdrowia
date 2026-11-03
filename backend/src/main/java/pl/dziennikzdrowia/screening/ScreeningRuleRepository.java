package pl.dziennikzdrowia.screening;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreeningRuleRepository extends JpaRepository<ScreeningRule, String> {

    List<ScreeningRule> findByActiveTrue();
}
