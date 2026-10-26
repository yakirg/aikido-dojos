package com.aikido.dojos.data;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
public class Membership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "practitioner_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Practitioner practitioner;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dojo_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Dojo dojo;
    @Column(length = 10)
    private String startDate;
    @Column(length = 10)
    private String endDate;
}
