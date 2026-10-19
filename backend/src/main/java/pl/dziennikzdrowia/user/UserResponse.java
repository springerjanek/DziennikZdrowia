package pl.dziennikzdrowia.user;

import java.util.UUID;

public record UserResponse(UUID id, String email, String name, String pictureUrl) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getPictureUrl());
    }
}
