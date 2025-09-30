package com.floresta.gestor.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.floresta.gestor.dto.entregaDTO;
import com.floresta.gestor.model.entrega;
import com.floresta.gestor.model.logIngreso;
import com.floresta.gestor.repository.entregaRepository;
import com.floresta.gestor.repository.logIngresoRepository;

import jakarta.validation.Valid;

@Service
public class entregaService {

	
	private final entregaRepository repository;
	private final logIngresoRepository logRepository;
	
	@Autowired
	entregaService(entregaRepository repository,logIngresoRepository logRepository){
		this.repository = repository;
		this.logRepository =logRepository;
	}
	
	
	@Transactional
	public entrega generarEntrega(@Valid entregaDTO request) {
		
		if(request.getEstado() == null) { 
			
			request.setEstado("PENDIENTE");
		}
		
		var nuevoPedido = entrega.builder()
				.cliente(request.getCliente())
				.producto(request.getProducto())
				.cantidad(request.getCantidad())
				.fechaEntrega(request.getFechaEntrega())
				.estado(request.getEstado())
				.total(request.getTotal())
				.build();
				
		return repository.save(nuevoPedido);
		
		
	}
	
	@Transactional
	public entrega actualizarEstado(Integer id, String nuevoEstado) {
        
		entrega pedido = repository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Entrega " + id + " no existe"));;
    
		var estadoAnterior = pedido.getEstado();
		pedido.setEstado(nuevoEstado);
		repository.save(pedido);
		
		if("ENTREGADO".equalsIgnoreCase(nuevoEstado) && !"ENTREGADO".equalsIgnoreCase(estadoAnterior)) { 
			
			var logPedido = logIngreso.builder()
					  .idPedido(pedido.getIdEntrega())
					  .cliente(pedido.getCliente())
					  .producto(pedido.getProducto())
					  .cantidad(pedido.getCantidad())
					  .total(pedido.getTotal())
					  .fechaEntrega(pedido.getFechaEntrega())
					  .build();
			
			logRepository.save(logPedido);
		}
		
		return pedido;
	}
	
	@Transactional
	public entrega actualizarPedido(Integer id, @Valid entregaDTO request) {
        
		entrega pedido = repository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Entrega " + id + " no existe"));

		pedido.setCliente(request.getCliente());
		pedido.setProducto(request.getProducto());
		pedido.setCantidad(request.getCantidad());
		pedido.setFechaEntrega(request.getFechaEntrega());
		pedido.setEstado(request.getEstado());
		pedido.setTotal(request.getTotal());
		
		repository.save(pedido);
		
		return pedido;
    
	}
	
	@Transactional
	public boolean eliminarEntrega(Integer id) {
		
		if (!repository.existsById(id)) return false; 

		  try {
		    repository.deleteById(id);
		    return true;
		  } catch (org.springframework.dao.DataIntegrityViolationException e) {
		    return false; 
		  }
	}
	
	@Transactional(readOnly = true) 
    public List<entrega> obtenerPedidosActivos() {
    	
        return repository.findByEstadoIn(List.of("PENDIENTE", "EN_PROCESO"));
    }
	
}
