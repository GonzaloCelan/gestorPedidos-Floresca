package com.floresta.gestor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


import com.floresta.gestor.model.ProductoItem;

@Repository
public interface productoRepository extends JpaRepository<ProductoItem, Long> {

	  void deleteByIdPedido(Integer idPedido);   
	  
	  @Query(value = """
		        SELECT  pi.idProducto,
				pi.id_pedido,
				pi.producto_nombre,
                pi.cantidad,
                pi.precio_unit,
                pi.subtotal 
        FROM producto_item pi
        INNER JOIN pedidos p ON p.idPedido = pi.id_pedido
        WHERE p.idPedido = :id
        ORDER BY pi.id_pedido
		    """, nativeQuery = true)
	  List<ProductoItem> findItemsByPedidoId(@Param("id") Integer id);
}
