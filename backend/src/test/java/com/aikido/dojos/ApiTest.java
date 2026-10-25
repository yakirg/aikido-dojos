package com.aikido.dojos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;
    @org.springframework.test.context.bean.override.mockito.MockitoBean ZipLookupClient zipLookup;
    @Autowired ObjectMapper om;

    private long create(String url, Map<String, Object> body) throws Exception {
        String res = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return om.readTree(res).get("id").asLong();
    }

    @Test
    void dojoCrudAndSearch() throws Exception {
        long id = create("/api/dojos", Map.of("name", "Hombu Dojo", "city", "Tokyo", "country", "Japan"));
        mvc.perform(get("/api/dojos?q=tokyo")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Hombu Dojo"));
        mvc.perform(put("/api/dojos/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("name", "Hombu", "country", "Japan"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Hombu"));
        mvc.perform(delete("/api/dojos/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/dojos/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void dojoValidation() throws Exception {
        mvc.perform(post("/api/dojos").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void practitionerWithMultipleAndHistoricalDojos() throws Exception {
        long d1 = create("/api/dojos", Map.of("name", "Old Dojo", "country", "USA"));
        long d2 = create("/api/dojos", Map.of("name", "New Dojo", "country", "USA"));
        long d3 = create("/api/dojos", Map.of("name", "Second Current", "country", "USA"));
        long p = create("/api/practitioners", Map.of("firstName", "Ann", "lastName", "Zed", "rank", "SHODAN"));
        mvc.perform(get("/api/ranks")).andExpect(jsonPath("$[0].code").value("ROKYU"))
                .andExpect(jsonPath("$[6].japanese").value("shodan"));
        mvc.perform(get("/api/practitioners/" + p)).andExpect(jsonPath("$.rank").value("SHODAN"));
        mvc.perform(post("/api/practitioners").contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"rank\":\"Grandmaster\"}"))
                .andExpect(status().isBadRequest());

        long old = create("/api/practitioners/" + p + "/memberships",
                Map.of("dojoId", d1, "startDate", "2015-01-01", "endDate", "2018-06-30"));
        create("/api/practitioners/" + p + "/memberships", Map.of("dojoId", d2, "startDate", "2018-07-01"));
        create("/api/practitioners/" + p + "/memberships", Map.of("dojoId", d3, "startDate", "2019-01-01"));

        mvc.perform(get("/api/practitioners/" + p)).andExpect(jsonPath("$.memberships.length()").value(3));
        mvc.perform(get("/api/practitioners?dojoId=" + d1)).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(p));
        mvc.perform(get("/api/practitioners?q=zed&dojoId=" + d2)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/dojos/" + d1 + "/memberships")).andExpect(jsonPath("$[0].practitionerName").value("Ann Zed"));

        mvc.perform(delete("/api/dojos/" + d1)).andExpect(status().isConflict());
        mvc.perform(put("/api/memberships/" + old).contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("dojoId", d1, "startDate", "2015-01-01", "endDate", "2019-01-01"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.endDate").value("2019-01-01"));
        mvc.perform(delete("/api/memberships/" + old)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/dojos/" + d1)).andExpect(status().isNoContent());

        mvc.perform(delete("/api/practitioners/" + p)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/dojos/" + d2)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/dojos/" + d3)).andExpect(status().isNoContent());
    }

    @Test
    void dojoFounderAndFoundedDate() throws Exception {
        long f = create("/api/practitioners", Map.of("firstName", "Mo", "lastName", "Founder"));
        long d = create("/api/dojos", Map.of("name", "Founded Dojo", "country", "USA",
                "foundedDate", "1998-04-12", "closedDate", "2010-06-30", "founderId", f));
        mvc.perform(get("/api/dojos/" + d)).andExpect(jsonPath("$.foundedDate").value("1998-04-12"))
                .andExpect(jsonPath("$.closedDate").value("2010-06-30"))
                .andExpect(jsonPath("$.founderName").value("Mo Founder"));
        mvc.perform(post("/api/dojos").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("name", "X", "country", "Y", "founderId", 99999))))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/practitioners/" + f)).andExpect(status().isNoContent());
        mvc.perform(get("/api/dojos/" + d)).andExpect(jsonPath("$.founderId").doesNotExist());
    }

    @Test
    void rankHistoryTracksPreviousRanks() throws Exception {
        long p = create("/api/practitioners", Map.of("firstName", "Rae", "lastName", "Hist"));
        long a1 = create("/api/practitioners/" + p + "/rank-awards", Map.of("rank", "IKKYU", "awardedDate", "2015-01-01"));
        create("/api/practitioners/" + p + "/rank-awards", Map.of("rank", "SHODAN", "awardedDate", "2018-06-01"));
        mvc.perform(get("/api/practitioners/" + p)).andExpect(jsonPath("$.rank").value("SHODAN"))
                .andExpect(jsonPath("$.rankHistory.length()").value(2))
                .andExpect(jsonPath("$.rankHistory[0].rank").value("SHODAN"))
                .andExpect(jsonPath("$.rankHistory[1].awardedDate").value("2015-01-01"));
        mvc.perform(put("/api/rank-awards/" + a1).contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("rank", "NIDAN", "awardedDate", "2020-01-01"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/practitioners/" + p)).andExpect(jsonPath("$.rank").value("NIDAN"));
        mvc.perform(delete("/api/rank-awards/" + a1)).andExpect(status().isNoContent());
        mvc.perform(get("/api/practitioners/" + p)).andExpect(jsonPath("$.rank").value("SHODAN"))
                .andExpect(jsonPath("$.rankHistory.length()").value(1));
    }

    @Test
    void locationLookupAndState() throws Exception {
        org.mockito.Mockito.when(zipLookup.lookup("US", "90210")).thenReturn(
                java.util.Optional.of(new ZipLookupClient.Location("90210", "Beverly Hills", "CA", "United States")));
        org.mockito.Mockito.when(zipLookup.lookup("US", "00000")).thenReturn(java.util.Optional.empty());
        mvc.perform(get("/api/locations/lookup?country=US&postalCode=90210")).andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Beverly Hills")).andExpect(jsonPath("$.state").value("CA"));
        mvc.perform(get("/api/locations/lookup?country=US&postalCode=00000")).andExpect(status().isNotFound());
        mvc.perform(get("/api/locations/lookup?country=USA&postalCode=90210")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/countries")).andExpect(jsonPath("$[?(@.code=='US')].name").value("United States"));
        long d = create("/api/dojos", Map.of("name", "Zip Dojo", "country", "United States", "state", "CA",
                "postalCode", "90210"));
        mvc.perform(get("/api/dojos/" + d)).andExpect(jsonPath("$.state").value("CA"))
                .andExpect(jsonPath("$.postalCode").value("90210"));
    }

    @Test
    void invalidMembershipRejected() throws Exception {
        long d = create("/api/dojos", Map.of("name", "Bad Dates", "country", "USA"));
        long p = create("/api/practitioners", Map.of("firstName", "A", "lastName", "B"));
        mvc.perform(post("/api/practitioners/" + p + "/memberships").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("dojoId", d, "startDate", "2020-01-01", "endDate", "2019-01-01"))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/practitioners/" + p + "/memberships").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("dojoId", 99999))))
                .andExpect(status().isBadRequest());
    }
}
