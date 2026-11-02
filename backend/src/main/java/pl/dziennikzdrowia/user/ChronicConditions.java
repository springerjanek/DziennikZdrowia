package pl.dziennikzdrowia.user;

import java.util.Set;

/**
 * Dozwolone id chorob przewleklych. Musza byc zgodne z chronicConditionIdSchema
 * we frontend/src/domain/conditions.ts - po dodaniu choroby na froncie dopisz ja tutaj.
 */
public final class ChronicConditions {

    public static final Set<String> IDS = Set.of(
            "hypertension",
            "diabetes_t2",
            "diabetes_t1",
            "hypothyroidism",
            "hyperthyroidism",
            "asthma",
            "copd",
            "hyperlipidemia",
            "ihd",
            "ckd",
            "depression",
            "ibd",
            "osteoporosis",
            "migraine"
    );

    private ChronicConditions() {
    }
}
