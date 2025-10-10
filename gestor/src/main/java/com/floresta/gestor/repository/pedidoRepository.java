package com.floresta.gestor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.pedido;


@Repository
public interface pedidoRepository extends JpaRepository<pedido, Integer> {

	
	
	List<pedido> findByEstadoIn(List<String> estadoS);

	List<pedido> findByEstadoInAndTipoVenta(List<String> of, String string);
	
	
}
