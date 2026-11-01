package pl.dziennikzdrowia.medication.catalog;

import java.util.List;

/** Zawartość załącznika XLSX do obwieszczenia, gotowa do zapisu w bazie. */
public record ParsedAnnouncement(List<CatalogMedication> medications, List<CatalogEntitlement> entitlements) {
}
