package com.floresta.gestor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.Pedido;


@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

	
	
	List<Pedido> findByEstadoIn(List<String> estados);

	List<Pedido> findByEstadoInAndTipoVenta(List<String> of, String string);

	void deleteById(Long pedidoId);
	
	
}
