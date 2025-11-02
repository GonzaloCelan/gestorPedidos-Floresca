package com.floresta.gestor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.Pedido;


@Repository
public interface pedidoRepository extends JpaRepository<Pedido, Integer> {

	
	
	List<Pedido> findByEstadoIn(List<String> estadoS);

	List<Pedido> findByEstadoInAndTipoVenta(List<String> of, String string);
	
	
}
