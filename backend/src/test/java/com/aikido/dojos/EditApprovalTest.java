package com.aikido.dojos;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:approval;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.admin.username=boss", "app.admin.password=correct-horse"})
class EditApprovalTest {
    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper om;
    @MockitoBean ZipLookupClient zipLookup;
    @MockitoBean org.springframework.mail.javamail.JavaMailSender mailSender;

    @Test
    void adminsWithEmailAreNotifiedOfPendingEdits() throws Exception {
        String cookie = login();
        long id = call(HttpMethod.GET, "/api/admin/users", cookie, null, HttpStatus.OK).get(0).get("id").asLong();
        call(HttpMethod.PUT, "/api/admin/users/" + id + "/email", cookie, "{\"email\":\"boss@example.com\"}", HttpStatus.OK);
        call(HttpMethod.PUT, "/api/admin/users/" + id + "/email", cookie, "{\"email\":\"not-an-email\"}", HttpStatus.BAD_REQUEST);
        call(HttpMethod.POST, "/api/dojos", null, "{\"name\":\"Mail Dojo\",\"country\":\"USA\"}", HttpStatus.ACCEPTED);
        var captor = org.mockito.ArgumentCaptor.forClass(org.springframework.mail.SimpleMailMessage.class);
        org.mockito.Mockito.verify(mailSender, org.mockito.Mockito.timeout(5000)).send(captor.capture());
        assertThat(captor.getValue().getTo()).containsExactly("boss@example.com");
        assertThat(captor.getValue().getText()).contains("Mail Dojo", "/#/changes");
    }

    private HttpHeaders json(String cookie) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (cookie != null) h.add(HttpHeaders.COOKIE, cookie);
        return h;
    }

    private String login() {
        ResponseEntity<String> r = rest.exchange("/api/auth/login", HttpMethod.POST,
                new HttpEntity<>("{\"username\":\"boss\",\"password\":\"correct-horse\"}", json(null)), String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        return r.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
    }

    private JsonNode call(HttpMethod m, String url, String cookie, String body, HttpStatus expect) throws Exception {
        ResponseEntity<String> r = rest.exchange(url, m, new HttpEntity<>(body, json(cookie)), String.class);
        assertThat(r.getStatusCode()).as(url + " " + r.getBody()).isEqualTo(expect);
        return r.getBody() == null || r.getBody().isBlank() ? null : om.readTree(r.getBody());
    }

    @Test
    void anonymousEditsStayPrivateUntilApproved() throws Exception {
        JsonNode pending = call(HttpMethod.POST, "/api/dojos", null, "{\"name\":\"Hidden Dojo\",\"country\":\"USA\"}", HttpStatus.ACCEPTED);
        assertThat(pending.get("pending").asBoolean()).isTrue();
        assertThat(call(HttpMethod.GET, "/api/dojos?q=Hidden", null, null, HttpStatus.OK)).isEmpty();

        call(HttpMethod.GET, "/api/changes", null, null, HttpStatus.UNAUTHORIZED);
        call(HttpMethod.POST, "/api/changes/" + pending.get("changeId").asLong() + "/approve", null, null, HttpStatus.UNAUTHORIZED);

        String cookie = login();
        assertThat(call(HttpMethod.GET, "/api/auth/me", cookie, null, HttpStatus.OK).get("admin").asBoolean()).isTrue();
        JsonNode list = call(HttpMethod.GET, "/api/changes?status=PENDING", cookie, null, HttpStatus.OK);
        assertThat(list.get(0).get("label").asText()).isEqualTo("Hidden Dojo");

        call(HttpMethod.POST, "/api/changes/" + pending.get("changeId").asLong() + "/approve", cookie, null, HttpStatus.OK);
        assertThat(call(HttpMethod.GET, "/api/dojos?q=Hidden", null, null, HttpStatus.OK)).hasSize(1);
        call(HttpMethod.POST, "/api/changes/" + pending.get("changeId").asLong() + "/approve", cookie, null, HttpStatus.CONFLICT);
    }

    @Test
    void rejectedEditsNeverApplyAndAdminEditsApplyImmediately() throws Exception {
        String cookie = login();
        JsonNode dojo = call(HttpMethod.POST, "/api/dojos", cookie, "{\"name\":\"Direct Dojo\",\"country\":\"USA\"}", HttpStatus.CREATED);
        long id = dojo.get("id").asLong();

        JsonNode pending = call(HttpMethod.PUT, "/api/dojos/" + id, null, "{\"name\":\"Vandalized\",\"country\":\"USA\"}", HttpStatus.ACCEPTED);
        call(HttpMethod.DELETE, "/api/dojos/" + id, null, null, HttpStatus.ACCEPTED);
        call(HttpMethod.POST, "/api/changes/" + pending.get("changeId").asLong() + "/reject", cookie, "{\"note\":\"no\"}", HttpStatus.OK);
        assertThat(call(HttpMethod.GET, "/api/dojos/" + id, null, null, HttpStatus.OK).get("name").asText()).isEqualTo("Direct Dojo");
        assertThat(call(HttpMethod.GET, "/api/changes/count", cookie, null, HttpStatus.OK).get("pending").asLong()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void wrongPasswordAndFakeReplayTokenRejected() throws Exception {
        call(HttpMethod.POST, "/api/auth/login", null, "{\"username\":\"boss\",\"password\":\"nope\"}", HttpStatus.UNAUTHORIZED);
        HttpHeaders h = json(null);
        h.add("X-Replay-Token", "guess");
        ResponseEntity<String> r = rest.exchange("/api/dojos", HttpMethod.POST,
                new HttpEntity<>("{\"name\":\"Sneaky\",\"country\":\"USA\"}", h), String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    }

    @Test
    void loginsAndPasswordChangesAreAuditedWithoutPasswords() throws Exception {
        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger("audit");
        var appender = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        try {
            call(HttpMethod.POST, "/api/auth/login", null, "{\"username\":\"boss\",\"password\":\"wrong-secret-1\"}", HttpStatus.UNAUTHORIZED);
            String cookie = login();
            long id = call(HttpMethod.POST, "/api/admin/users", cookie,
                    "{\"username\":\"second\",\"password\":\"new-secret-123\"}", HttpStatus.CREATED).get("id").asLong();
            call(HttpMethod.PUT, "/api/admin/users/" + id + "/password", cookie,
                    "{\"password\":\"changed-secret-9\"}", HttpStatus.NO_CONTENT);
            var sub = call(HttpMethod.POST, "/api/dojos", null, "{\"name\":\"Audit Dojo\",\"country\":\"USA\"}", HttpStatus.ACCEPTED);
            call(HttpMethod.POST, "/api/changes/" + sub.get("changeId").asLong() + "/approve", cookie, null, HttpStatus.OK);
            var sub2 = call(HttpMethod.POST, "/api/dojos", null, "{\"name\":\"Audit Dojo 2\",\"country\":\"USA\"}", HttpStatus.ACCEPTED);
            call(HttpMethod.POST, "/api/changes/" + sub2.get("changeId").asLong() + "/reject", cookie, "{}", HttpStatus.OK);
            call(HttpMethod.POST, "/api/dojos", cookie, "{\"name\":\"Direct Dojo\",\"country\":\"USA\"}", HttpStatus.CREATED);
            String all = appender.list.stream().map(e -> e.getFormattedMessage()).reduce("", (a, b) -> a + b + "\n");
            assertThat(all).contains("ADMIN_EDIT by=boss method=POST path=/api/dojos ip=");
            assertThat(all).contains("EDIT_SUBMITTED change=" + sub.get("changeId").asLong(),
                    "EDIT_APPROVED change=" + sub.get("changeId").asLong() + " by=boss",
                    "EDIT_REJECTED change=" + sub2.get("changeId").asLong() + " by=boss");
            assertThat(all).contains("LOGIN_FAILURE user=boss", "LOGIN_SUCCESS user=boss",
                    "ADMIN_ADDED user=second by=boss", "PASSWORD_CHANGED user=second by=boss");
            assertThat(all).doesNotContain("wrong-secret-1", "new-secret-123", "changed-secret-9", "correct-horse");
        } finally {
            logger.detachAppender(appender);
        }
    }
}
