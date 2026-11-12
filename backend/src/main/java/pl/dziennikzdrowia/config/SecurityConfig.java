package pl.dziennikzdrowia.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    // Ciasteczko XSRF-TOKEN czytelne dla JS; front odsyła je w nagłówku X-XSRF-TOKEN.
    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            SecurityContextRepository securityContextRepository,
                                            CsrfTokenRepository csrfTokenRepository) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/google").permitAll()
                        // Logowanie testera (DevAuthController). Kontroler istnieje tylko z profilem "local",
                        // bez niego pod tym adresem nic nie ma i jest 404.
                        .requestMatchers(HttpMethod.POST, "/api/auth/dev-login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // Wyszukiwarka lekow jest w onboardingu, przed logowaniem; wykaz MZ jest publiczny.
                        .requestMatchers(HttpMethod.GET, "/api/medications/search").permitAll()
                        // Katalog badan profilaktycznych to publiczne informacje NFZ: bez danych osobowych, tylko odczyt.
                        // Badania konkretnego uzytkownika (/api/me/screenings) dalej wymagaja logowania.
                        .requestMatchers(HttpMethod.GET, "/api/screening/rules").permitAll()
                        // Inaczej każdy błąd (400, 403) zamienia się w 401 przy przekierowaniu na /error.
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                // API zwraca 401 zamiast przekierowania na stronę logowania.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());
        return http.build();
    }
}
