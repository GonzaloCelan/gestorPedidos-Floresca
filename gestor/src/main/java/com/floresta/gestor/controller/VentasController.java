package com.floresta.gestor.controller;

import java.util.List;

import org.springframework.data.domain.Pageable; 
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.floresta.gestor.dto.venta.VentaResponseDTO;
import com.floresta.gestor.model.Venta;

import com.floresta.gestor.repository.VentaRepository;
import com.floresta.gestor.service.VentasService;


@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class VentasController {

	
	private final VentaRepository ventaRepository;
	private final VentasService service;

    public VentasController(VentaRepository ventaRepository,VentasService service) {
        this.ventaRepository = ventaRepository;
        this.service = service;
    }

    @GetMapping("/ventas")
    public ResponseEntity<List<VentaResponseDTO>> obtenerVentas() 
    {
    	List<VentaResponseDTO> response = service.obtenerVentas(); 
    	
    	return ResponseEntity.ok(response);
    }
    
    
    @GetMapping("/ventas/page")
    public Page<Venta> obtenerVentasPaginado(
        @PageableDefault(sort = "fechaEntrega", direction = Sort.Direction.DESC, size = 5)
        Pageable pageable) {
      return ventaRepository.findAllByOrderByFechaEntregaDesc(pageable);
    }
    
    @DeleteMapping("/ventas/{id}")
    public ResponseEntity<Void> eliminarVenta(@PathVariable Long id) {
        boolean eliminado = service.eliminarVenta(id);

        if (eliminado) {
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found
        }
    }
    
    @GetMapping("/ventas/balance/{mes}")
    public ResponseEntity<Double> balanceMensual(@PathVariable String mes)
    {
    	
    	double response = service.balanceMensual(mes);
    	return ResponseEntity.ok(response);
    }
    
   
   
    		
    
    
    
}
