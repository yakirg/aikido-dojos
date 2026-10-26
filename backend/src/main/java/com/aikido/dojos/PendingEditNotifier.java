package com.aikido.dojos;

import com.aikido.dojos.data.AppUser;
import com.aikido.dojos.data.ChangeRequest;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** Emails every admin that has an address when a non-admin edit is queued. Needs spring.mail.host. */
@Component
public class PendingEditNotifier {
    private static final Logger log = LoggerFactory.getLogger(PendingEditNotifier.class);

    private final ObjectProvider<JavaMailSender> mail;
    private final AppUserRepository users;
    private final String from;
    private final String publicUrl;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "pending-edit-mail");
        t.setDaemon(true);
        return t;
    });

    PendingEditNotifier(ObjectProvider<JavaMailSender> mail, AppUserRepository users,
                        @Value("${app.mail.from:noreply@aikidodojos.local}") String from,
                        @Value("${app.public-url:https://aikidodojos.duckdns.org:8443}") String publicUrl) {
        this.mail = mail;
        this.users = users;
        this.from = from;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    public void notifyAdmins(ChangeRequest c) {
        JavaMailSender sender = mail.getIfAvailable();
        if (sender == null) {
            log.info("Edit #{} pending approval; no mail server configured (set spring.mail.host) so admins were not emailed", c.getId());
            return;
        }
        List<String> to = users.findAll().stream().map(AppUser::getEmail)
                .filter(e -> e != null && !e.isBlank()).toList();
        if (to.isEmpty()) {
            log.info("Edit #{} pending approval; no admin has an email address", c.getId());
            return;
        }
        String what = oneLine(c.getAction() + " " + c.getEntityType()
                + (c.getLabel() == null ? "" : ": " + c.getLabel()));
        String text = "A new edit is waiting for approval.\n\n" + what + "\n\nReview it here: "
                + publicUrl + "/#/changes\n";
        executor.execute(() -> {
            for (String addr : to) {
                try {
                    SimpleMailMessage m = new SimpleMailMessage();
                    m.setFrom(from);
                    m.setTo(addr);
                    m.setSubject("Aikido Dojos: edit pending approval");
                    m.setText(text);
                    sender.send(m);
                } catch (Exception e) {
                    log.warn("Could not email pending-edit notice to {}: {}", addr, e.getMessage());
                }
            }
        });
    }

    private static String oneLine(String s) {
        return s.replaceAll("[\\p{Cntrl}]+", " ");
    }
}
