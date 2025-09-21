package com.floresta.gestor.controller;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.model.logIngreso;
import com.floresta.gestor.repository.logIngresoRepository;

@RestController
@RequestMapping("/api/gestor/logs")
public class logIngresoController {

	
	private final logIngresoRepository logRepository;

    public logIngresoController(logIngresoRepository logRepository) {
        this.logRepository = logRepository;
    }

    @GetMapping
    public List<logIngreso> obtenerLogs() {
        return logRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaEntrega")); // ordenado por fecha
    }
}
