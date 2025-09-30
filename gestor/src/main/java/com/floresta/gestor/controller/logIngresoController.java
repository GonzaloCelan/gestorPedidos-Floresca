package com.floresta.gestor.controller;

import java.util.List;

import org.springframework.data.domain.Pageable; 
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.model.logIngreso;
import com.floresta.gestor.repository.logIngresoRepository;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class logIngresoController {

	
	private final logIngresoRepository logRepository;

    public logIngresoController(logIngresoRepository logRepository) {
        this.logRepository = logRepository;
    }

    @GetMapping("/logs")
    public List<logIngreso> obtenerLogs() {
        return logRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaEntrega")); // ordenado por fecha
    }
    
    
    @GetMapping("/logs/page")
    public Page<logIngreso> obtenerLogsPaginado(
        @PageableDefault(sort = "fechaEntrega", direction = Sort.Direction.DESC, size = 10)
        Pageable pageable) {
      return logRepository.findAllByOrderByFechaEntregaDesc(pageable);
    }
}
