package com.aikido.dojos;

import com.aikido.dojos.data.AppUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);
    static final String REPLAY_HEADER = "X-Replay-Token";

    /** Secret known only to this process; lets an approved change be replayed against our own API as an admin. */
    static final String REPLAY_TOKEN = HexFormat.of().formatHex(new SecureRandom().generateSeed(32));

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AppUserRepository users) {
        return username -> {
            AppUser u = users.findByUsernameIgnoreCase(username)
                    .orElseThrow(() -> new UsernameNotFoundException("unknown user"));
            return User.withUsername(u.getUsername()).password(u.getPasswordHash()).roles("ADMIN").build();
        };
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider(uds);
        p.setPasswordEncoder(encoder);
        return new ProviderManager(p);
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, SecurityContextRepository repo) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .headers(h -> h.frameOptions(f -> f.sameOrigin()))
            .securityContext(c -> c.securityContextRepository(repo))
            .cors(Customizer.withDefaults())
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(new ReplayFilter(), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/admin/**", "/api/changes/**").hasRole("ADMIN")
                .anyRequest().permitAll());
        return http.build();
    }

    @Bean
    ApplicationRunner bootstrapAdmin(AppUserRepository users, PasswordEncoder encoder,
                                     @Value("${app.admin.username:admin}") String username,
                                     @Value("${app.admin.password:}") String password) {
        return args -> {
            if (users.count() > 0) return;
            String pw = password;
            if (pw.isBlank()) {
                pw = HexFormat.of().formatHex(new SecureRandom().generateSeed(8));
                log.warn("No admin exists. Created '{}' with generated password: {}  (set ADMIN_PASSWORD to choose one)",
                        username, pw);
            } else {
                log.info("No admin exists. Created '{}' from ADMIN_PASSWORD.", username);
            }
            AppUser u = new AppUser();
            u.setUsername(username);
            u.setPasswordHash(encoder.encode(pw));
            users.save(u);
        };
    }

    static boolean isAdmin(org.springframework.security.core.Authentication a) {
        return a != null && a.isAuthenticated() && a.getAuthorities().stream()
                .anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));
    }

    static class ReplayFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            String token = req.getHeader(REPLAY_HEADER);
            if (token != null && MessageDigest.isEqual(token.getBytes(), REPLAY_TOKEN.getBytes())) {
                SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        "approved-change", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
            }
            chain.doFilter(req, res);
        }
    }
}
