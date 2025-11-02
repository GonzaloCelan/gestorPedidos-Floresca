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
import com.floresta.gestor.dto.PedidoDTO;
import com.floresta.gestor.dto.PedidoDatosDTO;
import com.floresta.gestor.dto.PedidoUpdateDTO;
import com.floresta.gestor.model.Pedido;
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
    @PostMapping ("/pedido")
    public ResponseEntity<Pedido> guardarEntrega(@Valid @RequestBody PedidoDTO dto) {
    	
    	Pedido response = service.generarPedido(dto);
    	
        return ResponseEntity.ok(response);
    }
    
    //ACTUALIZA ESTADO DEL PEDIDO
    
    @PutMapping("/pedido/{id}/{estado}")
    public ResponseEntity<Pedido> actualizarEntrega(
    		@PathVariable Integer id,
    		@PathVariable String estado) {
    	
    	Pedido response = service.actualizarEstado(id, estado);
    	
    	return ResponseEntity.ok(response);
    	
    }
    
  //ACTUALIZA PEDIDO ENTERO
    
    @PutMapping("/pedido/{id}")
    public ResponseEntity<Pedido> actualizarEntregaCompleto(
    		@PathVariable Integer id,
    		@RequestBody PedidoUpdateDTO dto) {
    	
    	Pedido response = service.actualizarPedido(id,dto);
    	

    	return ResponseEntity.ok(response);
    	
    }
    
    //ELIMINA UN PEDIDO POR ID
    @DeleteMapping("/pedido/{id}")
    public ResponseEntity<Void> eliminarEntrega(@PathVariable Integer id) {
        boolean eliminado = service.eliminarEntrega(id);

        if (eliminado) {
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found
        }
    }
    
  //OBTENGO UN PEDIDO POR ID
    @GetMapping("/pedido/datos/{id}")
    public ResponseEntity<PedidoDatosDTO> getPedidoById(@PathVariable Integer id){
    	
    	PedidoDatosDTO response = service.obtenerPedidoById(id);
    	return ResponseEntity.ok(response);
    	
    }
    
    //OBTENGO PRODUCTOS DE CADA PEDIDO
    @GetMapping("/pedido/producto/{id}")
    public ResponseEntity<List<ProductoDTO>> getProductosByIdPedido(@PathVariable Integer id){
    	
    	List<ProductoDTO> response = service.obtenerProductosById(id);
    	
    	return ResponseEntity.ok(response);
    	
    }
    
    //OBTENGO TODOS LOS PEDIDOS ACTIVOS
    @GetMapping("/pedidos")
    public ResponseEntity<List<Pedido>> getPedidosActivos(){
    	
    	List<Pedido> response = service.obtenerPedidosActivos();
    	return ResponseEntity.ok(response);
    	
    }
    
 
}

