package pl.dziennikzdrowia.user;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pl.dziennikzdrowia.config.AppTime;

import java.time.YearMonth;
import java.util.UUID;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public UserController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal UUID userId) {
        return userRepository.findById(userId)
                .map(UserResponse::from)
                // Sesja jest, ale usera usunięto z bazy.
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @GetMapping("/profile")
    public UserProfileResponse profile(@AuthenticationPrincipal UUID userId) {
        return userService.getProfile(userId);
    }

    @PutMapping("/profile")
    public UserProfileResponse updateProfile(@AuthenticationPrincipal UUID userId,
                                             @Valid @RequestBody UserProfileRequest request) {
        return userService.updateProfile(userId, request, YearMonth.now(AppTime.ZONE));
    }
}
