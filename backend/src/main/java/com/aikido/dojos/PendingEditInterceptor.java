package com.aikido.dojos;

import com.aikido.dojos.data.ChangeRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Parks every non-admin write request as a pending ChangeRequest instead of executing it. */
@Component
public class PendingEditInterceptor implements HandlerInterceptor {
    private static final Set<String> WRITES = Set.of("POST", "PUT", "DELETE");
    private static final Pattern PATH = Pattern.compile(
            "^/api/(dojos|practitioners|memberships|rank-awards|leaders|locations)(?:/(\\d+))?(?:/(memberships|rank-awards|leaders|locations))?$");

    private final ChangeRequestRepository changes;
    private final DojoRepository dojos;
    private final PractitionerRepository practitioners;
    private final ObjectMapper om;
    private final PendingEditNotifier notifier;

    PendingEditInterceptor(ChangeRequestRepository changes, DojoRepository dojos,
                           PractitionerRepository practitioners, ObjectMapper om, PendingEditNotifier notifier) {
        this.changes = changes;
        this.dojos = dojos;
        this.practitioners = practitioners;
        this.om = om;
        this.notifier = notifier;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        String path = req.getRequestURI();
        if (!WRITES.contains(req.getMethod()) || !path.startsWith("/api/")
                || path.startsWith("/api/auth/") || path.startsWith("/api/admin/") || path.startsWith("/api/changes")) {
            return true;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (SecurityConfig.isAdmin(auth)) {
            if (!"approved-change".equals(auth.getName())) {
                Matcher am = PATH.matcher(path);
                if (am.matches()) {
                    req.setAttribute(ADMIN_EDIT, new String[] {am.group(1), am.group(2), am.group(3),
                            label(am.group(1), am.group(3), am.group(2) == null ? null : Long.valueOf(am.group(2)), null)});
                }
            }
            return true;
        }
        Matcher m = PATH.matcher(path);
        if (!m.matches()) {
            res.sendError(HttpStatus.FORBIDDEN.value());
            return false;
        }
        String body = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (body.length() > 20000) {
            res.sendError(HttpStatus.PAYLOAD_TOO_LARGE.value());
            return false;
        }
        JsonNode json = null;
        if (!body.isBlank()) {
            try {
                json = om.readTree(body);
            } catch (Exception e) {
                res.sendError(HttpStatus.BAD_REQUEST.value());
                return false;
            }
        }

        String collection = m.group(1);
        Long id = m.group(2) == null ? null : Long.valueOf(m.group(2));
        String child = m.group(3);
        String entity = entityName(collection, child);
        String action = switch (req.getMethod()) {
            case "POST" -> "CREATE";
            case "PUT" -> "UPDATE";
            default -> "DELETE";
        };

        ChangeRequest c = new ChangeRequest();
        c.setMethod(req.getMethod());
        c.setPath(path);
        c.setBody(body.isBlank() ? null : body);
        c.setEntityType(entity);
        c.setAction(action);
        c.setTargetId(id);
        c.setLabel(label(collection, child, id, json));
        c.setSubmittedBy("anonymous");
        c.setSubmitterToken(MyEditsController.tokenFor(req, res));
        c.setSubmittedAt(Instant.now());
        c = changes.save(c);
        ChangeRequestController.audit("EDIT_SUBMITTED", c, null);
        notifier.notifyAdmins(c);

        res.setStatus(HttpStatus.ACCEPTED.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write(om.writeValueAsString(Map.of("pending", true, "changeId", c.getId(),
                "message", "Thanks! Your edit was submitted and will appear once an administrator approves it.")));
        return false;
    }

    static final String ADMIN_EDIT = "audit.adminEdit";
    static final String BODY = "audit.body";

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        Object attr = req.getAttribute(ADMIN_EDIT);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(attr instanceof String[] a) || auth == null) return;
        Long id = a[1] == null ? null : Long.valueOf(a[1]);
        JsonNode json = req.getAttribute(BODY) instanceof JsonNode n ? n : null;
        String lbl = a[3] != null ? a[3] : label(a[0], a[2], id, json);
        String verb = switch (req.getMethod()) {
            case "POST" -> "created";
            case "PUT" -> "updated";
            default -> "deleted";
        };
        boolean ok = res.getStatus() < 400 && ex == null;
        String what = (ok ? verb : "FAILED to " + verbBase(verb)) + " " + entityName(a[0], a[2]).toLowerCase() + (lbl == null ? "" : " '" + lbl + "'")
                + (id == null ? "" : " (id " + id + ")");
        org.slf4j.LoggerFactory.getLogger("audit").info("ADMIN_EDIT by={} {} ip={}",
                auth.getName().replaceAll("[\\p{Cntrl}\"]", "_"),
                what.replaceAll("[\\p{Cntrl}\"]", "_"),
                req.getRemoteAddr());
    }

    private static String verbBase(String v) {
        return v.equals("created") ? "create" : v.equals("updated") ? "update" : "delete";
    }
    private String label(String collection, String child, Long id, JsonNode json) {
        String text = null;
        if (child == null && collection.equals("dojos")) {
            text = textOf(json, "name");
            if (text == null && id != null) text = dojos.findById(id).map(d -> d.getName()).orElse(null);
        } else if (child == null && collection.equals("practitioners")) {
            String first = textOf(json, "firstName"), last = textOf(json, "lastName");
            if (first != null || last != null) text = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
            if (text == null && id != null) {
                text = practitioners.findById(id).map(p -> p.getFirstName() + " " + p.getLastName()).orElse(null);
            }
        } else if (child != null && id != null && collection.equals("dojos")) {
            text = dojos.findById(id).map(d -> "for " + d.getName()).orElse(null);
        } else if (child != null && id != null) {
            text = practitioners.findById(id).map(p -> "for " + p.getFirstName() + " " + p.getLastName()).orElse(null);
        }
        if (text == null) return null;
        return text.length() > 300 ? text.substring(0, 300) : text;
    }

    private static String entityName(String collection, String child) {
        if (child != null) return childEntity(child);
        return switch (collection) {
            case "dojos" -> "Dojo";
            case "practitioners" -> "Practitioner";
            case "memberships" -> "Membership";
            case "leaders" -> "Dojo leader";
            case "locations" -> "Dojo location";
            default -> "Rank award";
        };
    }
    private static String childEntity(String child) {
        return switch (child) {
            case "memberships" -> "Membership";
            case "leaders" -> "Dojo leader";
            case "locations" -> "Dojo location";
            default -> "Rank award";
        };
    }

    private static String textOf(JsonNode json, String field) {
        return json != null && json.hasNonNull(field) && !json.get(field).asText().isBlank() ? json.get(field).asText() : null;
    }
}
