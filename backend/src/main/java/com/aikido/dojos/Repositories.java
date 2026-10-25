package com.aikido.dojos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface DojoRepository extends JpaRepository<Dojo, Long> {
    List<Dojo> findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByName(
            String name, String city, String country);
}

interface PractitionerRepository extends JpaRepository<Practitioner, Long>, JpaSpecificationExecutor<Practitioner> {
}

interface MembershipRepository extends JpaRepository<Membership, Long> {
    boolean existsByDojoId(Long dojoId);

    List<Membership> findByDojoIdOrderByPractitionerLastNameAscPractitionerFirstNameAsc(Long dojoId);
}
