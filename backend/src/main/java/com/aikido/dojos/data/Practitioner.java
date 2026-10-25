package com.aikido.dojos.data;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
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
    @Enumerated(EnumType.STRING)
    @Column(name = "rank_name", length = 50)
    private Rank rank;
    private LocalDate startDate;
    @OneToMany(mappedBy = "practitioner", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("startDate DESC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Membership> memberships = new ArrayList<>();
    @OneToMany(mappedBy = "practitioner", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<RankAward> rankAwards = new ArrayList<>();

    /** Current rank is the most recent award; undated awards count as oldest, ties go to the higher rank. */
    public void refreshCurrentRank() {
        rank = rankAwards.stream()
                .max(Comparator.comparing((RankAward a) -> a.getAwardedDate() == null ? LocalDate.MIN : a.getAwardedDate())
                        .thenComparing(RankAward::getRank))
                .map(RankAward::getRank).orElse(null);
    }
}
