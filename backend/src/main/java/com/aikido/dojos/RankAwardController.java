package com.aikido.dojos;

import com.aikido.dojos.data.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Comparator;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Transactional
public class RankAwardController {
    static final Comparator<RankAward> NEWEST_FIRST = Comparator
            .comparing((RankAward a) -> a.getAwardedDate() == null ? "" : a.getAwardedDate())
            .thenComparing(RankAward::getRank).reversed();

    public record RankAwardRequest(@NotNull Rank rank, @PartialDates.Valid String awardedDate) {}

    public record RankAwardResponse(Long id, Long practitionerId, Rank rank, String awardedDate) {
        static RankAwardResponse of(RankAward a) {
            return new RankAwardResponse(a.getId(), a.getPractitioner().getId(), a.getRank(), a.getAwardedDate());
        }
    }

    private final RankAwardRepository awards;
    private final PractitionerRepository practitioners;

    RankAwardController(RankAwardRepository awards, PractitionerRepository practitioners) {
        this.awards = awards;
        this.practitioners = practitioners;
    }

    @PostMapping("/practitioners/{practitionerId}/rank-awards")
    @ResponseStatus(HttpStatus.CREATED)
    public RankAwardResponse create(@PathVariable Long practitionerId, @Valid @RequestBody RankAwardRequest r) {
        Practitioner p = practitioners.findById(practitionerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practitioner not found"));
        RankAward a = new RankAward();
        a.setPractitioner(p);
        a.setRank(r.rank());
        a.setAwardedDate(r.awardedDate());
        p.getRankAwards().add(a);
        RankAward saved = awards.save(a);
        p.refreshCurrentRank();
        return RankAwardResponse.of(saved);
    }

    @PutMapping("/rank-awards/{id}")
    public RankAwardResponse update(@PathVariable Long id, @Valid @RequestBody RankAwardRequest r) {
        RankAward a = find(id);
        a.setRank(r.rank());
        a.setAwardedDate(r.awardedDate());
        RankAward saved = awards.save(a);
        a.getPractitioner().refreshCurrentRank();
        return RankAwardResponse.of(saved);
    }

    @DeleteMapping("/rank-awards/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        RankAward a = find(id);
        Practitioner p = a.getPractitioner();
        p.getRankAwards().remove(a);
        awards.delete(a);
        p.refreshCurrentRank();
    }

    private RankAward find(Long id) {
        return awards.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rank award not found"));
    }
}
