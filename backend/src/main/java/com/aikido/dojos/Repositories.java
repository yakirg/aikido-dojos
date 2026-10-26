package com.aikido.dojos;

import com.aikido.dojos.data.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface DojoRepository extends JpaRepository<Dojo, Long> {
    List<Dojo> findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByName(
            String name, String city, String country);
}

interface PractitionerRepository extends JpaRepository<Practitioner, Long>, JpaSpecificationExecutor<Practitioner> {
}

interface RankAwardRepository extends JpaRepository<RankAward, Long> {
}

interface MembershipRepository extends JpaRepository<Membership, Long> {
    boolean existsByDojoId(Long dojoId);

    List<Membership> findByDojoIdOrderByPractitionerLastNameAscPractitionerFirstNameAsc(Long dojoId);
}

interface DojoLeaderRepository extends JpaRepository<DojoLeader, Long> {
    List<DojoLeader> findByDojoIdOrderByStartDateDesc(Long dojoId);
}

interface AppUserRepository extends JpaRepository<AppUser, Long> {
    java.util.Optional<AppUser> findByUsernameIgnoreCase(String username);
}

interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {
    List<ChangeRequest> findByStatusOrderBySubmittedAtDesc(ChangeRequest.Status status);

    List<ChangeRequest> findAllByOrderBySubmittedAtDesc();

    long countByStatus(ChangeRequest.Status status);
}
