package pl.dziennikzdrowia.medication.catalog;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
public class MedicationSearchController {

    private static final int MAX_LIMIT = 50;

    private final MedicationSearchService searchService;

    public MedicationSearchController(MedicationSearchService searchService) {
        this.searchService = searchService;
    }

    /** {@code q} to nazwa handlowa albo substancja, po łacinie ("metforminum") albo po polsku ("metformina"). */
    @GetMapping("/search")
    public List<MedicationSearchResult> search(@RequestParam String q,
                                               @RequestParam(defaultValue = "20") int limit) {
        return searchService.search(q, Math.clamp(limit, 1, MAX_LIMIT));
    }
}
