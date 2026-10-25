package dtechdigital.cms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Disable CSRF for API endpoints
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        // Allow IoT device endpoints (no authentication needed)
                        .requestMatchers("/api/device-status/**").permitAll()
                        .requestMatchers("/api/script-generator/**").permitAll()

                        // 🔧 ADD THESE LINES - DASHBOARD APIs
                        .requestMatchers("/api/analytics/**").permitAll()
                        .requestMatchers("/api/alerts/**").permitAll()

                        // Allow monitoring endpoints
                        .requestMatchers("/actuator/**").permitAll()

                        // Allow static resources and error pages
                        .requestMatchers("/", "/index.html", "/static/**", "/error").permitAll()
                        // Add to your SecurityConfig.java
                        .requestMatchers("/api/device-history/**").permitAll()

                        // Authentication is disabled for this CMS build
                        .anyRequest().permitAll()


                );

        return http.build();
    }
}
