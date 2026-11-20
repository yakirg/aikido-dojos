package com.aikido.dojos;

import com.aikido.dojos.data.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Transactional
public class DojoLocationController {
    public record LocationRequest(@Size(max = 300) String address, @Size(max = 100) String city, @Size(max = 100) String state,
                                  @Size(max = 20) String postalCode, @NotBlank @Size(max = 100) String country,
                                  @PartialDates.Valid String startDate, @PartialDates.Valid String endDate) {}

    public record LocationResponse(Long id, Long dojoId, String address, String city, String state, String postalCode,
                                   String country, String startDate, String endDate) {
        static LocationResponse of(DojoLocation l) {
            return new LocationResponse(l.getId(), l.getDojo().getId(), l.getAddress(), l.getCity(), l.getState(),
                    l.getPostalCode(), l.getCountry(), l.getStartDate(), l.getEndDate());
        }
    }

    private final DojoLocationRepository locations;
    private final DojoRepository dojos;

    DojoLocationController(DojoLocationRepository locations, DojoRepository dojos) {
        this.locations = locations;
        this.dojos = dojos;
    }

    /** Current location (no end date) first, then newest first. */
    @GetMapping("/dojos/{dojoId}/locations")
    public List<LocationResponse> forDojo(@PathVariable Long dojoId) {
        return locations.findByDojoIdOrderByStartDateDesc(dojoId).stream()
                .sorted(Comparator.comparing((DojoLocation l) -> l.getEndDate() != null))
                .map(LocationResponse::of).toList();
    }

    @PostMapping("/dojos/{dojoId}/locations")
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse create(@PathVariable Long dojoId, @Valid @RequestBody LocationRequest r) {
        Dojo d = dojos.findById(dojoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dojo not found"));
        DojoLocation l = new DojoLocation();
        l.setDojo(d);
        l = locations.saveAndFlush(apply(l, r));
        syncCurrent(d);
        return LocationResponse.of(l);
    }

    @PutMapping("/locations/{id}")
    public LocationResponse update(@PathVariable Long id, @Valid @RequestBody LocationRequest r) {
        DojoLocation l = locations.saveAndFlush(apply(find(id), r));
        syncCurrent(l.getDojo());
        return LocationResponse.of(l);
    }

    @DeleteMapping("/locations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Dojo d = find(id).getDojo();
        locations.deleteById(id);
        locations.flush();
        syncCurrent(d);
    }

    /** The dojo's own address fields mirror its current location: open-ended, latest start. */
    void syncCurrent(Dojo d) {
        locations.findByDojoIdOrderByStartDateDesc(d.getId()).stream()
                .filter(l -> l.getEndDate() == null)
                .findFirst()
                .ifPresent(l -> {
                    d.setAddress(l.getAddress());
                    d.setCity(l.getCity());
                    d.setState(l.getState());
                    d.setPostalCode(l.getPostalCode());
                    d.setCountry(l.getCountry());
                    dojos.save(d);
                });
    }

    private DojoLocation find(Long id) {
        return locations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));
    }

    private DojoLocation apply(DojoLocation l, LocationRequest r) {
        if (r.startDate() != null && r.endDate() != null && PartialDates.isBefore(r.endDate(), r.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must not be before startDate");
        }
        l.setAddress(r.address());
        l.setCity(r.city());
        l.setState(r.state());
        l.setPostalCode(r.postalCode());
        l.setCountry(r.country());
        l.setStartDate(r.startDate());
        l.setEndDate(r.endDate());
        return l;
    }
}