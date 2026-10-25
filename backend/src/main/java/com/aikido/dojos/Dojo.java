package com.aikido.dojos;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Entity
public class Dojo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Size(max = 200)
    private String name;
    @Size(max = 100)
    private String city;
    @NotBlank @Size(max = 100)
    private String country;
    @Size(max = 300)
    private String address;
    @Size(max = 300)
    private String website;
    private Integer foundedYear;
}
