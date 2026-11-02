package pl.dziennikzdrowia.medication.catalog;

import java.net.URI;
import java.time.LocalDate;

/** Obwieszczenie MZ znalezione na gov.pl: od kiedy obowiązuje i gdzie jest jego strona. */
public record Announcement(LocalDate effectiveDate, URI pageUrl) {
}
