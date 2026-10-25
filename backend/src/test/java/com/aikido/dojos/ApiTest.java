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
    void practitionerLinkedToDojo() throws Exception {
        long dojo = create("/api/dojos", Map.of("name", "Link Dojo", "country", "USA"));
        long p = create("/api/practitioners",
                Map.of("firstName", "Ann", "lastName", "Zed", "rank", "Shodan", "dojoId", dojo));
        mvc.perform(get("/api/practitioners?dojoId=" + dojo)).andExpect(jsonPath("$[0].dojoName").value("Link Dojo"));
        mvc.perform(get("/api/practitioners?q=zed")).andExpect(jsonPath("$[0].id").value(p));
        mvc.perform(delete("/api/dojos/" + dojo)).andExpect(status().isConflict());
        mvc.perform(put("/api/practitioners/" + p).contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("firstName", "Ann", "lastName", "Zed"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dojoId").doesNotExist());
        mvc.perform(delete("/api/practitioners/" + p)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/dojos/" + dojo)).andExpect(status().isNoContent());
    }

    @Test
    void unknownDojoRejected() throws Exception {
        mvc.perform(post("/api/practitioners").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("firstName", "A", "lastName", "B", "dojoId", 99999))))
                .andExpect(status().isBadRequest());
    }
}
