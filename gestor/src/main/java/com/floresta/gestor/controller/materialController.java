package com.floresta.gestor.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.dto.materialDTO;
import com.floresta.gestor.model.material;
import com.floresta.gestor.service.materialService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class materialController {

	private final materialService service;
	
	public materialController(materialService materialService) {
        this.service = materialService;
    }
	
	
	 //GUARDA UN MATERIAL NUEVO
    @PostMapping("/materiales")
    public ResponseEntity<material> crearMaterial(@Valid @RequestBody materialDTO request) {
    	material nuevo = service.guardarMaterial(request);
        return ResponseEntity.ok(nuevo);
    }

    //OBTIENE TODOS LOS MATERIALES
    @GetMapping("/materiales")
    public ResponseEntity<List<material>> listarMateriales() {
        return ResponseEntity.ok(service.obtenerTodos());
    }

  //OBTIENE UN MATERIAL POR ID
    @GetMapping("/materiales/{id}")
    public ResponseEntity<material> obtenerMaterial(@PathVariable Long id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

  //ELIMINA UN MATERIAL POR ID
    @DeleteMapping("/materiales/{id}")
    public ResponseEntity<Void> eliminarMaterial(@PathVariable Long id) {
    	service.eliminarPorId(id);
        return ResponseEntity.noContent().build();
    }
    
   
	
}
