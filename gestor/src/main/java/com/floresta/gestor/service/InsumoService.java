package com.floresta.gestor.service;

import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.floresta.gestor.dto.insumo.InsumoCreadoDTO;
import com.floresta.gestor.dto.insumo.InsumoNuevoDTO;
import com.floresta.gestor.dto.insumo.InsumoResponseDTO;
import com.floresta.gestor.model.Insumo;
import com.floresta.gestor.repository.InsumoRepository;

import jakarta.validation.Valid;

@Service
public class InsumoService {

	
	private final InsumoRepository repository;

    public InsumoService(InsumoRepository materialRepository) {
        this.repository = materialRepository;
    }

    

    @Transactional
    public  InsumoCreadoDTO guardarMaterial(@Valid InsumoNuevoDTO request) {
    	
    	Insumo nuevoMaterial = Insumo.builder()
    			.fecha(request.fecha())
    			.material(request.material())
    			.cantidad(request.cantidad())
    			.proveedor(request.proveedor())
    			.precioUnitario(request.precioUnitario())
    			.precioTotal(request.precioTotal())
    			.build();
    	
        repository.save(nuevoMaterial);
        
        return new InsumoCreadoDTO(
        		nuevoMaterial.getId()
        );
    }

 
    @Transactional(readOnly = true) 
    public List<InsumoResponseDTO> obtenerTodos() {
    	
    	List<InsumoResponseDTO> listaInsumos = new ArrayList<>();
    	
        List<Insumo> insumo = repository.findAll();
        
        for(Insumo i : insumo) {
			InsumoResponseDTO insumoDTO = InsumoResponseDTO.builder()
					.idInsumo(i.getId())
					.fecha(i.getFecha())
					.material(i.getMaterial())
					.cantidad(i.getCantidad())
					.proveedor(i.getProveedor())
					.precioUnitario(i.getPrecioUnitario())
					.precioTotal(i.getPrecioTotal())
					.build();
		
			listaInsumos.add(insumoDTO);
        }
        
        return listaInsumos;
    }

    @Transactional(readOnly = true) 
    public InsumoResponseDTO obtenerPorId(Long id) {
    	
         Insumo insumoExiste = repository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Insumo con " + id + " no existe"));
         
         InsumoResponseDTO insumo = InsumoResponseDTO.builder()
		 		.idInsumo(insumoExiste.getId())
		 		.fecha(insumoExiste.getFecha())
		 		.material(insumoExiste.getMaterial())
		 		.cantidad(insumoExiste.getCantidad())
		 		.proveedor(insumoExiste.getProveedor())
		 		.precioUnitario(insumoExiste.getPrecioUnitario())
		 		.precioTotal(insumoExiste.getPrecioTotal())
		 		.build();
         
         return insumo;
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
