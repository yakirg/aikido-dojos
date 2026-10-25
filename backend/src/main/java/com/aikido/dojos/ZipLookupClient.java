package com.aikido.dojos;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class ZipLookupClient {
    public record Location(String postalCode, String city, String state, String country) {}

    private final RestClient client;

    ZipLookupClient(@Value("${app.zip-lookup-url:https://api.zippopotam.us}") String baseUrl) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public Optional<Location> lookup(String countryCode, String postalCode) {
        String zip = postalCode.replaceAll("\\s+", "");
        if (countryCode.equalsIgnoreCase("CA") && zip.length() > 3) {
            zip = zip.substring(0, 3);
        }
        try {
            JsonNode body = client.get().uri("/{c}/{z}", countryCode.toLowerCase(), zip)
                    .retrieve().body(JsonNode.class);
            JsonNode place = body == null ? null : body.path("places").path(0);
            if (place == null || place.isMissingNode()) {
                return Optional.empty();
            }
            String state = place.path("state abbreviation").asText("");
            if (state.isEmpty()) {
                state = place.path("state").asText("");
            }
            return Optional.of(new Location(body.path("post code").asText(postalCode),
                    place.path("place name").asText(""), state, body.path("country").asText("")));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
}
