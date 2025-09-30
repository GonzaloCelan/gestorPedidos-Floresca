package com.floresta.gestor.repository;


import org.springframework.data.domain.Pageable; 
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.logIngreso;


@Repository
public interface logIngresoRepository extends JpaRepository<logIngreso, Integer> {
	
	Page<logIngreso> findAllByOrderByFechaEntregaDesc(Pageable pageable);
}