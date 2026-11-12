package pl.dziennikzdrowia.sor;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Wymaga logowania: chroni dzienny limit zapytań do kolejkisor.pl przed obcym ruchem. */
@RestController
@RequestMapping("/api/sor")
public class SorController {

    private final SorService sorService;

    public SorController(SorService sorService) {
        this.sorService = sorService;
    }

    /** Najbliższe SOR-y z aktualnym czasem oczekiwania; współrzędne z geolokalizacji przeglądarki. */
    @GetMapping("/nearest")
    public NearestSorResponse nearest(
            @RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
            @RequestParam @DecimalMin("-180") @DecimalMax("180") double lon) {
        return sorService.nearest(lat, lon);
    }
}
