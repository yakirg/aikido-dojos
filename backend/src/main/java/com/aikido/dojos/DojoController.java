package com.aikido.dojos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/dojos")
@Transactional
public class DojoController {
    public record DojoRequest(@NotBlank @Size(max = 200) String name, @Size(max = 100) String city,
                              @NotBlank @Size(max = 100) String country, @Size(max = 300) String address,
                              @Size(max = 300) String website, Integer foundedYear) {}

    private final DojoRepository dojos;
    private final MembershipRepository memberships;

    DojoController(DojoRepository dojos, MembershipRepository memberships) {
        this.dojos = dojos;
        this.memberships = memberships;
    }

    @GetMapping
    public List<Dojo> list(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return dojos.findAll(org.springframework.data.domain.Sort.by("name"));
        }
        return dojos.findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByName(
                q, q, q);
    }

    @GetMapping("/{id}")
    public Dojo get(@PathVariable Long id) {
        return find(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Dojo create(@Valid @RequestBody DojoRequest r) {
        return dojos.save(apply(new Dojo(), r));
    }

    @PutMapping("/{id}")
    public Dojo update(@PathVariable Long id, @Valid @RequestBody DojoRequest r) {
        return dojos.save(apply(find(id), r));
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
        d.setCountry(r.country());
        d.setAddress(r.address());
        d.setWebsite(r.website());
        d.setFoundedYear(r.foundedYear());
        return d;
    }
}
