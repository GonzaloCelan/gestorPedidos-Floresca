package com.floresta.gestor.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
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
import com.floresta.gestor.dto.pedido.PedidoActualizadoDTO;
import com.floresta.gestor.dto.pedido.PedidoCreadoDTO;
import com.floresta.gestor.dto.pedido.PedidoDetalleDTO;
import com.floresta.gestor.dto.pedido.PedidoEstadoDTO;
import com.floresta.gestor.dto.pedido.PedidoNuevoDTO;
import com.floresta.gestor.dto.pedido.PedidoResponseDTO;
import com.floresta.gestor.model.Insumo;
import com.floresta.gestor.model.Pedido;
import com.floresta.gestor.service.PedidoService;

import jakarta.validation.Valid;



@RestController
@RequestMapping("/api/v1")
public class PedidosController {
	
	
	
	private final PedidoService service;

    public PedidosController(PedidoService service) {
        this.service = service;
    }
    
    //GUARDA UN PEDIDO NUEVO
    @PostMapping ("/pedido")
    public ResponseEntity< PedidoCreadoDTO> guardarPedido( @Valid @RequestBody PedidoNuevoDTO dto) {
    	
    	
        	PedidoCreadoDTO response = service.generarPedido(dto);
        	
            return ResponseEntity.ok(response);
	    
    }
    
    //ACTUALIZA ESTADO DEL PEDIDO
    
    @PutMapping("/pedido/{id}/{estado}")
    
    public ResponseEntity<PedidoEstadoDTO> actualizarEstadoPedido(
    		@PathVariable Long id,
    		@PathVariable String estado) {
    	
    	PedidoEstadoDTO response = service.actualizarEstado(id, estado);
    	
    	System.out.println("Estado actualizado: " + response);
    	
    	return ResponseEntity.ok(response);
    	
    }
    
  //ACTUALIZA PEDIDO ENTERO
    
    @PutMapping("/pedido/{id}")
    public ResponseEntity<Pedido> actualizarPedidoCompleto(
    		@PathVariable Long id,
    		@RequestBody PedidoActualizadoDTO dto) {
    	
    	Pedido response = service.actualizarPedido(id,dto);
    	

    	return ResponseEntity.ok(response);
    	
    }
    
    //ELIMINA UN PEDIDO POR ID
    @DeleteMapping("/pedido/{id}")
    public ResponseEntity<Void> eliminarPedido(@PathVariable Long id) {
        boolean eliminado = service.eliminarEntrega(id);

        if (eliminado) {
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found
        }
    }
    
  //OBTENGO UN PEDIDO POR ID
    @GetMapping("/pedido/detalle/{id}")
    public ResponseEntity<PedidoDetalleDTO> getPedidoById(@PathVariable Long id){
    	
    	var response = service.obtenerPedidoById(id);
    	return ResponseEntity.ok(response);
    	
    }
    
 
    
    //OBTENGO TODOS LOS PEDIDOS ACTIVOS
    @GetMapping("/pedidos")
    public ResponseEntity<List<PedidoResponseDTO>> getPedidosActivos(){
    	
    	
    	List<PedidoResponseDTO> response = service.obtenerPedidosActivos();
    	
    	
    	return ResponseEntity.ok(response);
    	
    }
    
 
}

