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
    public List<Venta> obtenerLogs() {
        return ventaRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaEntrega")); // ordenado por fecha
    }
    
    
    @GetMapping("/ventas/page")
    public Page<Venta> obtenerLogsPaginado(
        @PageableDefault(sort = "fechaEntrega", direction = Sort.Direction.DESC, size = 10)
        Pageable pageable) {
      return ventaRepository.findAllByOrderByFechaEntregaDesc(pageable);
    }
    
    @DeleteMapping("/ventas/{id}")
    public ResponseEntity<Void> eliminarVenta(@PathVariable Integer id) {
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
