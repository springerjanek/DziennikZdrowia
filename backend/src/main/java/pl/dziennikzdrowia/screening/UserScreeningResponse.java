package pl.dziennikzdrowia.screening;

import java.time.LocalDate;
import java.util.UUID;

public record UserScreeningResponse(UUID id, String ruleId, String ruleLabel, LocalDate performedOn, String notes) {

    public static UserScreeningResponse from(UserScreening screening) {
        return new UserScreeningResponse(
                screening.getId(),
                screening.getRule().getId(),
                screening.getRule().getLabel(),
                screening.getPerformedOn(),
                screening.getNotes());
    }
}
