package pl.dziennikzdrowia.sor;

import com.fasterxml.jackson.annotation.JsonProperty;

record UpstreamHospital(
        String id,
        String name,
        String city,
        @JsonProperty("distance_km") Double distanceKm,
        @JsonProperty("main_wait_minutes") Integer mainWaitMinutes,
        @JsonProperty("total_patients") Integer totalPatients,
        @JsonProperty("load_category") String loadCategory,
        String freshness) {

    SorHospital toHospital() {
        return new SorHospital(id, name, city, distanceKm, mainWaitMinutes,
                totalPatients, loadCategory, freshness);
    }
}
