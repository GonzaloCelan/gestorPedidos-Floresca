package com.floresta.gestor.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.repository.ventaRepository;

@Service
public class VentasService {

	
	private final ventaRepository ventaRepository;
	
	@Autowired
	VentasService(ventaRepository ventaRepository){
		
		this.ventaRepository = ventaRepository;
		
	}
	
	@Transactional
	public boolean eliminarVenta(Integer id) {
		
		if (id == null) return false;
		if (!ventaRepository.existsById(id)) return false; 

		  try {
			  ventaRepository.deleteById(id);
		    return true;
		  } catch (org.springframework.dao.DataIntegrityViolationException e) {
		    return false; 
		  }
	}
	
	
	
}
