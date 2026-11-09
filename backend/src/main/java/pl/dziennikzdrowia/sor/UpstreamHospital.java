package pl.dziennikzdrowia.sor;

import com.fasterxml.jackson.annotation.JsonProperty;

record UpstreamHospital(
        String id,
        String name,
        String city,
        String address,
        @JsonProperty("distance_km") Double distanceKm,
        @JsonProperty("main_wait_minutes") Integer mainWaitMinutes,
        @JsonProperty("total_patients") Integer totalPatients,
        @JsonProperty("load_category") String loadCategory,
        Double lat,
        Double lon) {

    SorHospital toHospital() {
        return new SorHospital(id, name, city, address, distanceKm, mainWaitMinutes,
                totalPatients, loadCategory, lat, lon);
    }
}