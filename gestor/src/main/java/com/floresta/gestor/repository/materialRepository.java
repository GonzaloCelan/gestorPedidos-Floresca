package com.floresta.gestor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.material;

@Repository
public interface materialRepository extends JpaRepository<material, Long> {

	
	@Query(value = "SELECT SUM(precio_total) " +
             "FROM materiales " +
             "WHERE DATE_FORMAT(fecha, '%Y-%m') = :mes",
     nativeQuery = true)

	 Double calcularTotalMensual(@Param("mes") String mes);
}
