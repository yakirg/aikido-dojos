package com.aikido.dojos;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
public class Practitioner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Size(max = 100)
    private String firstName;
    @NotBlank @Size(max = 100)
    private String lastName;
    @Size(max = 200)
    private String email;
    @Size(max = 50)
    @Column(name = "rank_name")
    private String rank;
    private LocalDate startDate;
    @OneToMany(mappedBy = "practitioner", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("startDate DESC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Membership> memberships = new ArrayList<>();
}
