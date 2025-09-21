package com.floresta.gestor.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.floresta.gestor.dto.entregaDTO;
import com.floresta.gestor.model.entrega;
import com.floresta.gestor.model.logIngreso;
import com.floresta.gestor.repository.entregaRepository;
import com.floresta.gestor.repository.logIngresoRepository;

@Service
public class entregaService {

	
	private final entregaRepository repository;
	private final logIngresoRepository logRepository;
	
	@Autowired
	entregaService(entregaRepository repository,logIngresoRepository logRepository){
		this.repository = repository;
		this.logRepository =logRepository;
	}
	
	
	public entrega generarEntrega(entregaDTO request) {
		
		entrega response = entrega.builder()
				.cliente(request.getCliente())
				.producto(request.getProducto())
				.cantidad(request.getCantidad())
				.fechaEntrega(request.getFechaEntrega())
				.estado(request.getEstado())
				.total(request.getTotal())
				.build();
				
		return repository.save(response);
		
		
	}
	
	public Optional<entrega> actualizarEstado(Integer id, String nuevoEstado) {
        
		return repository.findById(id).map(entrega -> {
	        String estadoAnterior = entrega.getEstado();

	        entrega.setEstado(nuevoEstado);
	        entrega = repository.save(entrega);

	        // Log solo si pasa a "Listo" y antes no lo era
	        if ("ENTREGADO".equalsIgnoreCase(nuevoEstado) && !"ENTREGADO".equalsIgnoreCase(estadoAnterior)) {
	            logIngreso log = new logIngreso();
	            log.setIdPedido(entrega.getIdEntrega());
	            log.setCliente(entrega.getCliente());
	            log.setProducto(entrega.getProducto());
	            log.setCantidad(entrega.getCantidad());
	            log.setTotal(entrega.getTotal());
	            log.setFechaEntrega(entrega.getFechaEntrega());

	            logRepository.save(log);
	        }

	        return entrega;
	    });
    
	}
	
	public boolean eliminarEntrega(Integer id) {
	    Optional<entrega> entrega = repository.findById(id);
	    
	    if (entrega.isPresent()) {
	    	
	    	repository.deleteById(id);
	        return true;
	    } else {
	        return false;
	    }
	}
	

    public List<entrega> obtenerPedidosActivos() {
    	
        return repository.findByEstadoIn(List.of("PENDIENTE", "EN_PROCESO"));
    }
	
}
