package pl.dziennikzdrowia.sor;

import java.time.Instant;
import java.util.List;

/** @param fetchedAt kiedy pobraliśmy dane z kolejkisor.pl - front pokazuje, jak są świeże */
public record NearestSorResponse(List<SorHospital> hospitals, Instant fetchedAt) {
}
