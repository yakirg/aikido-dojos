package com.aikido.dojos;

import com.aikido.dojos.data.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/dojos")
@Transactional
public class DojoController {
    public record DojoRequest(@NotBlank @Size(max = 200) String name, @Size(max = 100) String city, @Size(max = 100) String state,
                              @NotBlank @Size(max = 100) String country, @Size(max = 300) String address,
                              @Size(max = 20) String postalCode, @Size(max = 300) String website, @PartialDates.Valid String foundedDate,                                                             @PartialDates.Valid String closedDate) {}

                                  public record FounderRef(Long id, String name) {}

                                  public record DojoResponse(Long id, String name, String city, String state, String postalCode, String country,
                                                             String address, String website, String foundedDate, String closedDate,
                                                             List<FounderRef> founders) {
                                      static DojoResponse of(Dojo d) {
                                          List<FounderRef> f = d.getLeaders().stream().filter(DojoLeader::isFounder)
                                                  .map(l -> l.getPractitioner())
                                                  .map(p -> new FounderRef(p.getId(), p.getFirstName() + " " + p.getLastName())).distinct().toList();
                                          return new DojoResponse(d.getId(), d.getName(), d.getCity(), d.getState(), d.getPostalCode(), d.getCountry(), d.getAddress(),
                                                  d.getWebsite(), d.getFoundedDate(), d.getClosedDate(), f);
                                      }
                                  }

    private final DojoRepository dojos;
    private final MembershipRepository memberships;
    private final PractitionerRepository practitioners;

    DojoController(DojoRepository dojos, MembershipRepository memberships, PractitionerRepository practitioners) {
        this.dojos = dojos;
        this.memberships = memberships;
        this.practitioners = practitioners;
    }

    @GetMapping
    public List<DojoResponse> list(@RequestParam(required = false) String q) {
        List<Dojo> result = q == null || q.isBlank()
                ? dojos.findAll(Sort.by("name"))
                : dojos.findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByName(
                        q, q, q);
        return result.stream().map(DojoResponse::of).toList();
    }

    @GetMapping("/{id}")
    public DojoResponse get(@PathVariable Long id) {
        return DojoResponse.of(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DojoResponse create(@Valid @RequestBody DojoRequest r) {
        return DojoResponse.of(dojos.save(apply(new Dojo(), r)));
    }

    @PutMapping("/{id}")
    public DojoResponse update(@PathVariable Long id, @Valid @RequestBody DojoRequest r) {
        return DojoResponse.of(dojos.save(apply(find(id), r)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        find(id);
        if (memberships.existsByDojoId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dojo still has memberships");
        }
        dojos.deleteById(id);
    }

    private Dojo find(Long id) {
        return dojos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dojo not found"));
    }

    private Dojo apply(Dojo d, DojoRequest r) {
        d.setName(r.name());
        d.setCity(r.city());
        d.setState(r.state());
        d.setPostalCode(r.postalCode());
        d.setCountry(r.country());
        d.setAddress(r.address());
        d.setWebsite(r.website());
        d.setFoundedDate(r.foundedDate());
        d.setClosedDate(r.closedDate());
        return d;
    }
}
