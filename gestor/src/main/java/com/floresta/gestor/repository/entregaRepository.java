package com.floresta.gestor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.entrega;


@Repository
public interface entregaRepository extends JpaRepository<entrega, Integer> {

	
	
	List<entrega> findByEstadoIn(List<String> estadoS);
	
	
}
