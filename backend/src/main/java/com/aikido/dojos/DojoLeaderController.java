package com.aikido.dojos;

import com.aikido.dojos.data.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Transactional
public class DojoLeaderController {
    public record LeaderRequest(@NotNull Long practitionerId, @PartialDates.Valid String startDate, @PartialDates.Valid String endDate,
                                Boolean founder) {}

    public record LeaderResponse(Long id, Long dojoId, String dojoName, Long practitionerId, String practitionerName,
                                 String startDate, String endDate, boolean founder) {
        static LeaderResponse of(DojoLeader l) {
            Practitioner p = l.getPractitioner();
            Dojo d = l.getDojo();
            return new LeaderResponse(l.getId(), d.getId(), d.getName(), p.getId(),
                    p.getFirstName() + " " + p.getLastName(), l.getStartDate(), l.getEndDate(), l.isFounder());
        }
    }

    private final DojoLeaderRepository leaders;
    private final DojoRepository dojos;
    private final PractitionerRepository practitioners;

    DojoLeaderController(DojoLeaderRepository leaders, DojoRepository dojos, PractitionerRepository practitioners) {
        this.leaders = leaders;
        this.dojos = dojos;
        this.practitioners = practitioners;
    }

    /** Current leaders (no end date) first, then newest tenure first. */
    @GetMapping("/dojos/{dojoId}/leaders")
    public List<LeaderResponse> forDojo(@PathVariable Long dojoId) {
        return leaders.findByDojoIdOrderByStartDateDesc(dojoId).stream()
                .sorted(Comparator.comparing((DojoLeader l) -> l.getEndDate() != null))
                .map(LeaderResponse::of).toList();
    }

    @PostMapping("/dojos/{dojoId}/leaders")
    @ResponseStatus(HttpStatus.CREATED)
    public LeaderResponse create(@PathVariable Long dojoId, @Valid @RequestBody LeaderRequest r) {
        DojoLeader l = new DojoLeader();
        l.setDojo(dojos.findById(dojoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dojo not found")));
        return LeaderResponse.of(leaders.save(apply(l, r)));
    }

    @PutMapping("/leaders/{id}")
    public LeaderResponse update(@PathVariable Long id, @Valid @RequestBody LeaderRequest r) {
        return LeaderResponse.of(leaders.save(apply(find(id), r)));
    }

    @DeleteMapping("/leaders/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        leaders.delete(find(id));
    }

    private DojoLeader find(Long id) {
        return leaders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leader not found"));
    }

    private DojoLeader apply(DojoLeader l, LeaderRequest r) {
        if (r.startDate() != null && r.endDate() != null && PartialDates.isBefore(r.endDate(), r.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must not be before startDate");
        }
        l.setPractitioner(practitioners.findById(r.practitionerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown practitionerId")));
        l.setStartDate(r.startDate());
        l.setEndDate(r.endDate());
        l.setFounder(Boolean.TRUE.equals(r.founder()));
        return l;
    }
}
