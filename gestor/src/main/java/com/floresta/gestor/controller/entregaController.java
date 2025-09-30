package com.floresta.gestor.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.dto.entregaDTO;
import com.floresta.gestor.model.entrega;
import com.floresta.gestor.service.entregaService;

import jakarta.validation.Valid;



@RestController
@RequestMapping("/api/v1")
public class entregaController {
	
	
	
	private final entregaService service;

    public entregaController(entregaService service) {
        this.service = service;
    }
    
    //GUARDA UN PEDIDO NUEVO
    @PostMapping ("/pedidos")
    public ResponseEntity<entrega> guardarEntrega(@Valid @RequestBody entregaDTO dto) {
    	
    	entrega response = service.generarEntrega(dto);
    	
        return ResponseEntity.ok(response);
    }
    
    //ACTUALIZA ESTADO DEL PEDIDO
    
    @PutMapping("/pedidos/{id}/{estado}")
    public ResponseEntity<entrega> actualizarEntrega(
    		@PathVariable Integer id,
    		@PathVariable String estado) {
    	
    	entrega response = service.actualizarEstado(id, estado);
    	
    	return ResponseEntity.ok(response);
    	
    }
    
  //ACTUALIZA PEDIDO ENTERO
    
    @PutMapping("/pedidos/{id}")
    public ResponseEntity<entrega> actualizarEntregaCompleto(
    		@PathVariable Integer id,
    		@RequestBody entregaDTO dto) {
    	
    	entrega response = service.actualizarPedido(id,dto);
    	

    	return ResponseEntity.ok(response);
    	
    }
    
    //ELIMINA UN PEDIDO POR ID
    @DeleteMapping("/pedidos/{id}")
    public ResponseEntity<Void> eliminarEntrega(@PathVariable Integer id) {
        boolean eliminado = service.eliminarEntrega(id);

        if (eliminado) {
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found
        }
    }
    
    //OBTENGO TODOS LOS PEDIDOS ACTIVOS
    @GetMapping("/pedidos")
    public ResponseEntity<List<entrega>> getPedidosActivos(){
    	
    	List<entrega> response = service.obtenerPedidosActivos();
    	return ResponseEntity.ok(response);
    	
    }
}
