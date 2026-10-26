package com.aikido.dojos;

import com.aikido.dojos.data.ChangeRequest;
import com.aikido.dojos.data.ChangeRequest.Status;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/changes")
public class ChangeRequestController {
    private static final org.slf4j.Logger AUDIT = org.slf4j.LoggerFactory.getLogger("audit");

    private record Reply(int status, String body) {}

    private final ChangeRequestRepository changes;
    private final Environment env;

    ChangeRequestController(ChangeRequestRepository changes, Environment env) {
        this.changes = changes;
        this.env = env;
    }

    @GetMapping
    public List<ChangeRequest> list(@RequestParam(required = false) Status status) {
        return status == null ? changes.findAllByOrderBySubmittedAtDesc() : changes.findByStatusOrderBySubmittedAtDesc(status);
    }

    @GetMapping("/count")
    public Map<String, Long> count() {
        return Map.of("pending", changes.countByStatus(Status.PENDING));
    }

    @PostMapping("/{id}/approve")
    public ChangeRequest approve(@PathVariable Long id, Principal admin) {
        ChangeRequest c = pending(id);
        Reply r;
        try {
            RestClient client = RestClient.create("http://localhost:" + env.getProperty("local.server.port", env.getProperty("server.port", "8090")));
            RestClient.RequestBodySpec spec = client.method(HttpMethod.valueOf(c.getMethod())).uri(c.getPath())
                    .header(SecurityConfig.REPLAY_HEADER, SecurityConfig.REPLAY_TOKEN);
            if (c.getBody() != null) spec = spec.contentType(MediaType.APPLICATION_JSON).body(c.getBody());
            r = spec.exchange((req, res) -> new Reply(res.getStatusCode().value(), new String(res.getBody().readAllBytes())));
        } catch (Exception e) {
            r = new Reply(500, e.getMessage());
        }
        if (r.status() < 200 || r.status() >= 300) {
            c.setError(abbreviate("Could not apply (HTTP " + r.status() + "): " + r.body()));
            changes.save(c);
            audit("EDIT_APPROVAL_FAILED", c, admin);
            throw new ResponseStatusException(HttpStatus.CONFLICT, c.getError());
        }
        c.setStatus(Status.APPROVED);
        c.setError(null);
        audit("EDIT_APPROVED", c, admin);
        return review(c, admin, null);
    }

    @PostMapping("/{id}/reject")
    public ChangeRequest reject(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body, Principal admin) {
        ChangeRequest c = pending(id);
        c.setStatus(Status.REJECTED);
        audit("EDIT_REJECTED", c, admin);
        return review(c, admin, body == null ? null : abbreviate(body.get("note")));
    }

    static void audit(String event, ChangeRequest c, Principal admin) {
        AUDIT.info("{} change={} by={} action={} entity={} target={} label=\"{}\" submittedBy={}", event, c.getId(),
                admin == null ? "-" : clean(admin.getName()), c.getAction(), clean(c.getEntityType()), c.getTargetId(),
                clean(c.getLabel()), clean(c.getSubmittedBy()));
    }

    private static String clean(String s) {
        return s == null ? "-" : s.replaceAll("[\\p{Cntrl}\"]", "_");
    }

    private ChangeRequest review(ChangeRequest c, Principal admin, String note) {
        c.setReviewedBy(admin.getName());
        c.setReviewedAt(Instant.now());
        c.setReviewNote(note);
        return changes.save(c);
    }

    private ChangeRequest pending(Long id) {
        ChangeRequest c = changes.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (c.getStatus() != Status.PENDING) throw new ResponseStatusException(HttpStatus.CONFLICT, "Already reviewed");
        return c;
    }

    private static String abbreviate(String s) {
        return s == null ? null : s.length() > 500 ? s.substring(0, 500) : s;
    }
}
