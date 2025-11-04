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

import com.floresta.gestor.dto.ProductoDTO;
import com.floresta.gestor.dto.insumo.InsumoCreadoDTO;
import com.floresta.gestor.dto.insumo.InsumoNuevoDTO;
import com.floresta.gestor.dto.insumo.InsumoResponseDTO;
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
	public ResponseEntity<InsumoCreadoDTO> crearInsumo(@Valid @RequestBody InsumoNuevoDTO request) {
	   
		InsumoCreadoDTO nuevo = service.guardarMaterial(request);
	        return ResponseEntity.ok(nuevo);
	   
	}


    //OBTIENE TODOS LOS MATERIALES
	@GetMapping("/insumos")
	public ResponseEntity <List<InsumoResponseDTO>> listaInsumos() {
	    
	        List<InsumoResponseDTO> lista = service.obtenerTodos();
	        return ResponseEntity.ok(lista);
	        
	}
	
  //OBTIENE UN MATERIAL POR ID
    @GetMapping("/insumo/{id}")
    public ResponseEntity<InsumoResponseDTO> obtenerInsumo(@PathVariable Long id) {
    	InsumoResponseDTO response =  service.obtenerPorId(id);
    	return ResponseEntity.ok(response);
                
    }

  //ELIMINA UN MATERIAL POR ID
    @DeleteMapping("/insumo/{id}")
    public ResponseEntity<Void> eliminarInsumo(@PathVariable Long id) {
    	service.eliminarPorId(id);
        return ResponseEntity.noContent().build();
    }
    
   
	
}
