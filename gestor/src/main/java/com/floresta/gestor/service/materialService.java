package com.floresta.gestor.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.floresta.gestor.dto.materialDTO;
import com.floresta.gestor.model.material;
import com.floresta.gestor.repository.materialRepository;

@Service
public class materialService {

	
	private final materialRepository repository;

    public materialService(materialRepository materialRepository) {
        this.repository = materialRepository;
    }

   
    public material guardarMaterial(materialDTO request) {
    	
    	material response = material.builder()
    			.fecha(request.getFecha())
    			.material(request.getMaterial())
    			.cantidad(request.getCantidad())
    			.proveedor(request.getProveedor())
    			.precioUnitario(request.getPrecioUnitario())
    			.precioTotal(request.getPrecioTotal())
    			.build();
    	
        return repository.save(response);
    }


    public List<material> obtenerTodos() {
        return repository.findAll();
    }


    public Optional<material> obtenerPorId(Long id) {
        return repository.findById(id);
    }


    public void eliminarPorId(Long id) {
    	repository.deleteById(id);
    }
    
 
}
