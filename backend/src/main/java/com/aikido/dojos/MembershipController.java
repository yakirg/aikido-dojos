package com.aikido.dojos;

import com.aikido.dojos.data.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Transactional
public class MembershipController {
    public record MembershipRequest(@NotNull Long dojoId, LocalDate startDate, LocalDate endDate) {}

    public record MembershipResponse(Long id, Long practitionerId, String practitionerName, Long dojoId,
                                     String dojoName, LocalDate startDate, LocalDate endDate) {
        static MembershipResponse of(Membership m) {
            Practitioner p = m.getPractitioner();
            Dojo d = m.getDojo();
            return new MembershipResponse(m.getId(), p.getId(), p.getFirstName() + " " + p.getLastName(), d.getId(),
                    d.getName(), m.getStartDate(), m.getEndDate());
        }
    }

    private final MembershipRepository memberships;
    private final PractitionerRepository practitioners;
    private final DojoRepository dojos;

    MembershipController(MembershipRepository memberships, PractitionerRepository practitioners,
                         DojoRepository dojos) {
        this.memberships = memberships;
        this.practitioners = practitioners;
        this.dojos = dojos;
    }

    @GetMapping("/dojos/{dojoId}/memberships")
    public List<MembershipResponse> forDojo(@PathVariable Long dojoId) {
        return memberships.findByDojoIdOrderByPractitionerLastNameAscPractitionerFirstNameAsc(dojoId).stream()
                .map(MembershipResponse::of).toList();
    }

    @PostMapping("/practitioners/{practitionerId}/memberships")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipResponse create(@PathVariable Long practitionerId, @Valid @RequestBody MembershipRequest r) {
        Practitioner p = practitioners.findById(practitionerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practitioner not found"));
        Membership m = new Membership();
        m.setPractitioner(p);
        apply(m, r);
        p.getMemberships().add(m);
        return MembershipResponse.of(memberships.save(m));
    }

    @PutMapping("/memberships/{id}")
    public MembershipResponse update(@PathVariable Long id, @Valid @RequestBody MembershipRequest r) {
        return MembershipResponse.of(memberships.save(apply(find(id), r)));
    }

    @DeleteMapping("/memberships/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Membership m = find(id);
        m.getPractitioner().getMemberships().remove(m);
        memberships.delete(m);
    }

    private Membership find(Long id) {
        return memberships.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));
    }

    private Membership apply(Membership m, MembershipRequest r) {
        if (r.startDate() != null && r.endDate() != null && r.endDate().isBefore(r.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must not be before startDate");
        }
        m.setDojo(dojos.findById(r.dojoId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown dojoId")));
        m.setStartDate(r.startDate());
        m.setEndDate(r.endDate());
        return m;
    }
}
