package pl.dziennikzdrowia.medication.catalog;

public record MedicationSearchResult(
        String ean,
        String name,
        String activeSubstance,
        String packSize,
        ReimbursementInfo reimbursement) {
}
