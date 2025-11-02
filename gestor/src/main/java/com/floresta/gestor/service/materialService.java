package com.floresta.gestor.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.dto.materialDTO;
import com.floresta.gestor.model.Insumo;
import com.floresta.gestor.repository.materialRepository;

import jakarta.validation.Valid;

@Service
public class materialService {

	
	private final materialRepository repository;

    public materialService(materialRepository materialRepository) {
        this.repository = materialRepository;
    }

    

    @Transactional
    public Insumo guardarMaterial(@Valid materialDTO request) {
    	
    	Insumo nuevoMaterial = Insumo.builder()
    			.fecha(request.getFecha())
    			.material(request.getMaterial())
    			.cantidad(request.getCantidad())
    			.proveedor(request.getProveedor())
    			.precioUnitario(request.getPrecioUnitario())
    			.precioTotal(request.getPrecioTotal())
    			.build();
    	
        return repository.save(nuevoMaterial);
    }

 
    @Transactional(readOnly = true) 
    public List<Insumo> obtenerTodos() {
        return repository.findAll();
    }

    @Transactional(readOnly = true) 
    public Optional<Insumo> obtenerPorId(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public boolean eliminarPorId(Long id) {
    	
    	if (!repository.existsById(id)) return false; 

		  try {
		    repository.deleteById(id);
		    return true;
		  } catch (org.springframework.dao.DataIntegrityViolationException e) {
		    return false; 
		  }
    }
    
 
}
