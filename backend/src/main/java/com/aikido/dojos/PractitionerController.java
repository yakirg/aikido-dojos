package com.aikido.dojos;

import com.aikido.dojos.MembershipController.MembershipResponse;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/practitioners")
@Transactional
public class PractitionerController {
    public record PractitionerRequest(@NotBlank @Size(max = 100) String firstName,
                                      @NotBlank @Size(max = 100) String lastName,
                                      @Size(max = 200) String email, Rank rank,
                                      LocalDate startDate) {}

    public record PractitionerResponse(Long id, String firstName, String lastName, String email, Rank rank,
                                       LocalDate startDate, List<MembershipResponse> memberships) {
        static PractitionerResponse of(Practitioner p) {
            return new PractitionerResponse(p.getId(), p.getFirstName(), p.getLastName(), p.getEmail(), p.getRank(),
                    p.getStartDate(), p.getMemberships().stream().map(MembershipResponse::of).toList());
        }
    }

    private final PractitionerRepository practitioners;

    PractitionerController(PractitionerRepository practitioners) {
        this.practitioners = practitioners;
    }

    @GetMapping
    public List<PractitionerResponse> list(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Long dojoId) {
        Specification<Practitioner> spec = (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("firstName")), like),
                        cb.like(cb.lower(root.get("lastName")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("email"), "")), like)));
            }
            if (dojoId != null) {
                ps.add(cb.equal(root.join("memberships").get("dojo").get("id"), dojoId));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
        return practitioners.findAll(spec, Sort.by("lastName", "firstName")).stream()
                .map(PractitionerResponse::of).toList();
    }

    @GetMapping("/{id}")
    public PractitionerResponse get(@PathVariable Long id) {
        return PractitionerResponse.of(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PractitionerResponse create(@Valid @RequestBody PractitionerRequest r) {
        return PractitionerResponse.of(practitioners.save(apply(new Practitioner(), r)));
    }

    @PutMapping("/{id}")
    public PractitionerResponse update(@PathVariable Long id, @Valid @RequestBody PractitionerRequest r) {
        return PractitionerResponse.of(practitioners.save(apply(find(id), r)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        practitioners.delete(find(id));
    }

    private Practitioner find(Long id) {
        return practitioners.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practitioner not found"));
    }

    private Practitioner apply(Practitioner p, PractitionerRequest r) {
        p.setFirstName(r.firstName());
        p.setLastName(r.lastName());
        p.setEmail(r.email());
        p.setRank(r.rank());
        p.setStartDate(r.startDate());
        return p;
    }
}
