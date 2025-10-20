package com.floresta.gestor.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


import com.floresta.gestor.model.venta;

@Repository
public interface ventaRepository extends JpaRepository<venta , Integer>{

	Page<venta> findAllByOrderByFechaEntregaDesc(Pageable pageable);
	

    @Query(value = "SELECT SUM(total) " +
                   "FROM ventas " +
                   "WHERE DATE_FORMAT(fecha_entrega, '%Y-%m') = :mes",
           nativeQuery = true)
    
    Double calcularTotalMensual(@Param("mes") String mes);

}
