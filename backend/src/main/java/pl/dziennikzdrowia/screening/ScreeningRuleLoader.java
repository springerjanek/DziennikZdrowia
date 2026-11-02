package pl.dziennikzdrowia.screening;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pl.dziennikzdrowia.user.ChronicConditions;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Przy kazdym starcie aplikacji wczytuje screening-rules.json i synchronizuje z tabela screening_rule:
 * nowe reguly dodaje, istniejace nadpisuje, a tych, ktorych nie ma juz w pliku - wylacza (active = false).
 * Dzieki temu reguly sa wersjonowane w gicie, zmiana idzie przez PR, a baza (tez produkcyjna) sama sie aktualizuje.
 * Bledny plik zatrzymuje start aplikacji - lepiej od razu zobaczyc blad niz pokazywac zle terminy badan.
 */
@Component
public class ScreeningRuleLoader implements ApplicationRunner {

    static final String RESOURCE = "screening-rules.json";

    private static final Logger log = LoggerFactory.getLogger(ScreeningRuleLoader.class);

    private final ScreeningRuleRepository ruleRepository;
    private final JsonMapper jsonMapper;

    public ScreeningRuleLoader(ScreeningRuleRepository ruleRepository, JsonMapper jsonMapper) {
        this.ruleRepository = ruleRepository;
        this.jsonMapper = jsonMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<ScreeningRuleDefinition> definitions = readDefinitions();
        definitions.forEach(ScreeningRuleLoader::validate);
        sync(definitions);
    }

    private List<ScreeningRuleDefinition> readDefinitions() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return jsonMapper.readValue(in, new TypeReference<List<ScreeningRuleDefinition>>() {
            });
        } catch (IOException e) {
            throw new IllegalStateException("Nie udalo sie wczytac " + RESOURCE, e);
        }
    }

    static void validate(ScreeningRuleDefinition d) {
        if (d.id() == null || d.id().isBlank()) {
            throw new IllegalStateException(RESOURCE + ": regula bez id");
        }
        if (d.label() == null || d.rationale() == null || d.source() == null || d.ageBasis() == null
                || d.sourceUrl() == null || d.verifiedAt() == null) {
            throw new IllegalStateException(RESOURCE + ": regula '" + d.id() + "' nie ma wymaganych pol");
        }
        if (d.intervals() == null || d.intervals().isEmpty()) {
            throw new IllegalStateException(RESOURCE + ": regula '" + d.id() + "' nie ma przedzialow (intervals)");
        }
        if (d.ageFrom() != null && d.ageTo() != null && d.ageFrom() > d.ageTo()) {
            throw new IllegalStateException(RESOURCE + ": regula '" + d.id() + "' ma ageFrom > ageTo");
        }
        for (ScreeningRuleDefinition.Interval interval : d.intervals()) {
            if (interval.intervalMonths() <= 0) {
                throw new IllegalStateException(RESOURCE + ": regula '" + d.id() + "' ma intervalMonths <= 0");
            }
        }
        if (d.anyCondition() != null) {
            for (String condition : d.anyCondition()) {
                if (!ChronicConditions.IDS.contains(condition)) {
                    throw new IllegalStateException(
                            RESOURCE + ": regula '" + d.id() + "' ma nieznana chorobe '" + condition + "'");
                }
            }
        }
    }

    private void sync(List<ScreeningRuleDefinition> definitions) {
        Set<String> seen = new HashSet<>();
        for (ScreeningRuleDefinition d : definitions) {
            if (!seen.add(d.id())) {
                throw new IllegalStateException(RESOURCE + ": powtorzone id '" + d.id() + "'");
            }
        }

        Map<String, ScreeningRule> existing = ruleRepository.findAll().stream()
                .collect(Collectors.toMap(ScreeningRule::getId, Function.identity()));

        for (ScreeningRuleDefinition d : definitions) {
            ScreeningRule rule = existing.get(d.id());
            if (rule == null) {
                rule = new ScreeningRule();
                rule.setId(d.id());
            }
            apply(d, rule);
            ruleRepository.save(rule);
        }

        int deactivated = 0;
        for (ScreeningRule rule : existing.values()) {
            if (!seen.contains(rule.getId()) && rule.isActive()) {
                rule.setActive(false);
                deactivated++;
            }
        }

        log.info("Reguly profilaktyczne: wczytano {}, wylaczono {}", definitions.size(), deactivated);
    }

    private static void apply(ScreeningRuleDefinition d, ScreeningRule rule) {
        rule.setLabel(d.label());
        rule.setRationale(d.rationale());
        rule.setSource(d.source());
        rule.setAgeBasis(d.ageBasis());
        rule.setSex(d.sex());
        rule.setAgeFrom(d.ageFrom());
        rule.setAgeTo(d.ageTo());
        rule.setNfzBenefit(d.nfzBenefit());
        rule.setSourceUrl(d.sourceUrl());
        rule.setVerifiedAt(d.verifiedAt());
        rule.setActive(true);

        // Podmieniamy zawartosc, a nie same kolekcje - Hibernate sledzi konkretne instancje.
        rule.getIntervals().clear();
        for (ScreeningRuleDefinition.Interval interval : d.intervals()) {
            rule.getIntervals().add(new AgeBand(interval.ageFrom(), interval.intervalMonths()));
        }
        rule.getAnyCondition().clear();
        if (d.anyCondition() != null) {
            rule.getAnyCondition().addAll(d.anyCondition());
        }
    }
}
