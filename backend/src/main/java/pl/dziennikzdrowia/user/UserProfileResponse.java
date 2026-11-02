package pl.dziennikzdrowia.user;

import java.util.List;

public record UserProfileResponse(Integer birthYear, Integer birthMonth, Sex sex, List<String> conditions) {

    public static UserProfileResponse from(User user) {
        // Posortowane, zeby odpowiedz byla stabilna (Set nie ma kolejnosci).
        List<String> conditions = user.getConditions().stream().sorted().toList();
        return new UserProfileResponse(user.getBirthYear(), user.getBirthMonth(), user.getSex(), conditions);
    }
}
