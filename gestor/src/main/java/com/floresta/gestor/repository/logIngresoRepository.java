package com.floresta.gestor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.floresta.gestor.model.logIngreso;


@Repository
public interface logIngresoRepository extends JpaRepository<logIngreso, Integer> {
    // Podés agregar métodos custom si querés, pero no es necesario para insertar
}