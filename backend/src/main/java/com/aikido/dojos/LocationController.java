package com.aikido.dojos;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class LocationController {
    public record Country(String code, String name) {}

    private final ZipLookupClient zipLookup;

    LocationController(ZipLookupClient zipLookup) {
        this.zipLookup = zipLookup;
    }

    @GetMapping("/countries")
    public List<Country> countries() {
        return Arrays.stream(Locale.getISOCountries())
                .map(c -> new Country(c, Locale.of("", c).getDisplayCountry(Locale.ENGLISH)))
                .sorted(Comparator.comparing(Country::name)).toList();
    }

    @GetMapping("/locations/lookup")
    public ZipLookupClient.Location lookup(@RequestParam String country, @RequestParam String postalCode) {
        if (!country.matches("[A-Za-z]{2}") || !postalCode.matches("[A-Za-z0-9 -]{1,12}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid country or postal code");
        }
        try {
            return zipLookup.lookup(country, postalCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Postal code not found"));
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Postal code lookup unavailable");
        }
    }
}
