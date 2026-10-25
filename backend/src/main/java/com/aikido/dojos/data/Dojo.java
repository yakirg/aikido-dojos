package com.aikido.dojos.data;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

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
    @Size(max = 100)
    private String state;
    @Size(max = 20)
    private String postalCode;
    @NotBlank @Size(max = 100)
    private String country;
    @Size(max = 300)
    private String address;
    @Size(max = 300)
    private String website;
    private LocalDate foundedDate;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "founder_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Practitioner founder;
}
