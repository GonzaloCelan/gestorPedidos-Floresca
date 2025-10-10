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

import com.floresta.gestor.dto.ProductoDTO;
import com.floresta.gestor.dto.pedidoDTO;
import com.floresta.gestor.dto.pedidoUpdateDTO;
import com.floresta.gestor.model.pedido;
import com.floresta.gestor.service.pedidoService;

import jakarta.validation.Valid;



@RestController
@RequestMapping("/api/v1")
public class pedidosController {
	
	
	
	private final pedidoService service;

    public pedidosController(pedidoService service) {
        this.service = service;
    }
    
    //GUARDA UN PEDIDO NUEVO
    @PostMapping ("/pedidos")
    public ResponseEntity<pedido> guardarEntrega(@Valid @RequestBody pedidoDTO dto) {
    	
    	pedido response = service.generarPedido(dto);
    	
        return ResponseEntity.ok(response);
    }
    
    //ACTUALIZA ESTADO DEL PEDIDO
    
    @PutMapping("/pedidos/{id}/{estado}")
    public ResponseEntity<pedido> actualizarEntrega(
    		@PathVariable Integer id,
    		@PathVariable String estado) {
    	
    	pedido response = service.actualizarEstado(id, estado);
    	
    	return ResponseEntity.ok(response);
    	
    }
    
  //ACTUALIZA PEDIDO ENTERO
    
    @PutMapping("/pedidos/{id}")
    public ResponseEntity<pedido> actualizarEntregaCompleto(
    		@PathVariable Integer id,
    		@RequestBody pedidoUpdateDTO dto) {
    	
    	pedido response = service.actualizarPedido(id,dto);
    	

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
    public ResponseEntity<List<pedido>> getPedidosActivos(){
    	
    	List<pedido> response = service.obtenerPedidosActivos();
    	return ResponseEntity.ok(response);
    	
    }
    
  //OBTENGO PRODUCTOS DE CADA PEDIDO
    @GetMapping("/pedidos/producto/{id}")
    public ResponseEntity<List<ProductoDTO>> getProductosByIdPedido(@PathVariable Integer id){
    	
    	List<ProductoDTO> response = service.obtenerProductosById(id);
    	
    	return ResponseEntity.ok(response);
    	
    }
}

