package com.floresta.gestor.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import com.floresta.gestor.model.venta;

@Repository
public interface ventaRepository extends JpaRepository<venta , Long>{

	Page<venta> findAllByOrderByFechaEntregaDesc(Pageable pageable);

}
