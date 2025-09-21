package com.floresta.gestor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.material;

@Repository
public interface materialRepository extends JpaRepository<material, Long> {

}
