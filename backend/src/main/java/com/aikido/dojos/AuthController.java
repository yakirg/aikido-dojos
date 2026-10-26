package com.aikido.dojos;

import com.aikido.dojos.data.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuthController {
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record UserRequest(@NotBlank @Size(max = 50) String username, @NotBlank @Size(min = 8, max = 72) String password,
                              @jakarta.validation.constraints.Email @Size(max = 200) String email) {}
    public record EmailRequest(@jakarta.validation.constraints.Email @Size(max = 200) String email) {}
    public record UserResponse(Long id, String username, String email) {}

    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepo;
    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    AuthController(AuthenticationManager authManager, SecurityContextRepository contextRepo,
                   AppUserRepository users, PasswordEncoder encoder) {
        this.authManager = authManager;
        this.contextRepo = contextRepo;
        this.users = users;
        this.encoder = encoder;
    }

    private static final Logger AUDIT = LoggerFactory.getLogger("audit");

    private static String clean(String s) {
        return s == null ? "" : s.replaceAll("[\\p{Cntrl}\\s]+", "_");
    }

    private static String client(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        return req.getRemoteAddr() + (xff == null ? "" : " (forwarded-for " + clean(xff) + ")");
    }

    @GetMapping("/auth/me")
    public Map<String, Object> me(Authentication auth) {
        boolean admin = SecurityConfig.isAdmin(auth);
        return Map.of("admin", admin, "username", admin ? auth.getName() : "");
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest r, HttpServletRequest req, HttpServletResponse res) {
        try {
            Authentication auth = authManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(r.username(), r.password()));
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(auth);
            SecurityContextHolder.setContext(ctx);
            if (req.getSession(false) != null) req.changeSessionId();
            else req.getSession(true);
            contextRepo.saveContext(ctx, req, res);
            AUDIT.info("LOGIN_SUCCESS user={} ip={}", clean(auth.getName()), client(req));
            return Map.of("admin", true, "username", auth.getName());
        } catch (AuthenticationException e) {
            AUDIT.warn("LOGIN_FAILURE user={} ip={}", clean(r.username()), client(req));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req, Principal me) {
        if (me != null) AUDIT.info("LOGOUT user={} ip={}", clean(me.getName()), client(req));
        var session = req.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/users")
    public List<UserResponse> listUsers() {
        return users.findAll().stream().map(u -> new UserResponse(u.getId(), u.getUsername(), u.getEmail())).toList();
    }

    @PutMapping("/admin/users/{id}/email")
    public UserResponse setEmail(@PathVariable Long id, @Valid @RequestBody EmailRequest r) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setEmail(r.email() == null || r.email().isBlank() ? null : r.email().trim());
        u = users.save(u);
        return new UserResponse(u.getId(), u.getUsername(), u.getEmail());
    }

    @PostMapping("/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse addUser(@Valid @RequestBody UserRequest r, HttpServletRequest req, Principal me) {
        if (users.findByUsernameIgnoreCase(r.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        AppUser u = new AppUser();
        u.setUsername(r.username().trim());
        u.setPasswordHash(encoder.encode(r.password()));
        u.setEmail(r.email() == null || r.email().isBlank() ? null : r.email().trim());
        u = users.save(u);
        AUDIT.info("ADMIN_ADDED user={} by={} ip={}", clean(u.getUsername()), clean(me.getName()), client(req));
        return new UserResponse(u.getId(), u.getUsername(), u.getEmail());
    }

    @PutMapping("/admin/users/{id}/password")
    public ResponseEntity<Void> setPassword(@PathVariable Long id, @RequestBody Map<String, String> body,
                                            HttpServletRequest req, Principal me) {
        String pw = body.get("password");
        if (pw == null || pw.length() < 8 || pw.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be 8-72 characters");
        }
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setPasswordHash(encoder.encode(pw));
        users.save(u);
        AUDIT.info("PASSWORD_CHANGED user={} by={} ip={}", clean(u.getUsername()), clean(me.getName()), client(req));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, HttpServletRequest req, Principal me) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (users.count() <= 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot remove the last admin");
        if (u.getUsername().equalsIgnoreCase(me.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove yourself");
        }
        users.delete(u);
        AUDIT.info("ADMIN_REMOVED user={} by={} ip={}", clean(u.getUsername()), clean(me.getName()), client(req));
        return ResponseEntity.noContent().build();
    }
}
