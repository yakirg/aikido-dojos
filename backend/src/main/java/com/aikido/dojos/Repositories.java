package com.aikido.dojos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface DojoRepository extends JpaRepository<Dojo, Long> {
    List<Dojo> findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByName(
            String name, String city, String country);
}

interface PractitionerRepository extends JpaRepository<Practitioner, Long>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Practitioner> {
    boolean existsByDojoId(Long dojoId);
}
