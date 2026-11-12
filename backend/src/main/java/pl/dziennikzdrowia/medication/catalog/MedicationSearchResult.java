package pl.dziennikzdrowia.medication.catalog;

import java.math.BigDecimal;

/**
 * {@code atc} pochodzi z Rejestru Produktów Leczniczych (null dla wyrobów medycznych, diet i leków spoza wykazu);
 * leki złożone mają kilka kodów po przecinku: "L01BA01, L04AX03".
 * {@code retailPrice} to cena detaliczna opakowania z obwieszczenia; dla leków spoza wykazu (NFZ) null.
 */
public record MedicationSearchResult(
        String ean,
        String name,
        String activeSubstance,
        String packSize,
        String atc,
        BigDecimal retailPrice,
        ReimbursementInfo reimbursement) {
}
