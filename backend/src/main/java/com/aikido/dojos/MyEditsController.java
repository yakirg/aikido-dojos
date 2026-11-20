package com.aikido.dojos;

import com.aikido.dojos.data.ChangeRequest;
import com.aikido.dojos.data.ChangeRequest.Status;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/** Lets an anonymous submitter see their own still-pending edits (identified by a private cookie). */
@RestController
@RequestMapping("/api/my-edits")
public class MyEditsController {
    static final String COOKIE = "editor";

    public record MyEdit(Long id, String action, String entityType, String label, String method, String path,
                         JsonNode body, Instant submittedAt) {}

    private final ChangeRequestRepository changes;
    private final ObjectMapper om;

    MyEditsController(ChangeRequestRepository changes, ObjectMapper om) {
        this.changes = changes;
        this.om = om;
    }

    static String tokenFor(HttpServletRequest req, HttpServletResponse res) {
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (COOKIE.equals(c.getName()) && c.getValue().matches("[0-9a-f-]{36}")) return c.getValue();
            }
        }
        String token = UUID.randomUUID().toString();
        Cookie c = new Cookie(COOKIE, token);
        c.setHttpOnly(true);
        c.setPath("/");
        c.setMaxAge(365 * 24 * 3600);
        c.setSecure(req.isSecure());
        c.setAttribute("SameSite", "Lax");
        res.addCookie(c);
        return token;
    }

    @GetMapping
    public List<MyEdit> mine(HttpServletRequest req) {
        String token = null;
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) if (COOKIE.equals(c.getName())) token = c.getValue();
        }
        if (token == null) return List.of();
        return changes.findBySubmitterTokenAndStatusOrderBySubmittedAtDesc(token, Status.PENDING).stream().map(c -> {
            JsonNode body = null;
            try {
                body = c.getBody() == null ? null : om.readTree(c.getBody());
            } catch (Exception ignored) { /* stored body is validated JSON */ }
            return new MyEdit(c.getId(), c.getAction(), c.getEntityType(), c.getLabel(), c.getMethod(), c.getPath(),
                    body, c.getSubmittedAt());
        }).toList();
    }
}
