package com.floresta.gestor.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.dto.InsumoDTO;
import com.floresta.gestor.model.Insumo;
import com.floresta.gestor.service.InsumoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class InsumoController {

	private final InsumoService service;
	
	public InsumoController(InsumoService materialService) {
        this.service = materialService;
    }
	
	
	 //GUARDA UN INSUMO NUEVO
	@PostMapping("/insumo")
	public ResponseEntity<?> crearMaterial(@Valid @RequestBody InsumoDTO request) {
	    try {
	        Insumo nuevo = service.guardarMaterial(request);
	        return ResponseEntity.ok(nuevo);
	    } catch (Exception e) {
	        System.err.println("Error al guardar insumo: " + e.getMessage());
	        e.printStackTrace(); // opcional: muestra el stack completo
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                             .body("Error al guardar insumo");
	    }
	}


    //OBTIENE TODOS LOS MATERIALES
	@GetMapping("/insumos")
	public ResponseEntity<?> listarMateriales() {
	    try {
	        List<Insumo> lista = service.obtenerTodos();
	        return ResponseEntity.ok(lista);
	    } catch (Exception e) {
	        System.err.println("Error al listar insumos: " + e.getMessage());
	        e.printStackTrace();
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                             .body("Error al listar insumos");
	    }
	}
  //OBTIENE UN MATERIAL POR ID
    @GetMapping("/insumo/{id}")
    public ResponseEntity<Insumo> obtenerMaterial(@PathVariable Long id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

  //ELIMINA UN MATERIAL POR ID
    @DeleteMapping("/insumo/{id}")
    public ResponseEntity<Void> eliminarMaterial(@PathVariable Long id) {
    	service.eliminarPorId(id);
        return ResponseEntity.noContent().build();
    }
    
   
	
}
