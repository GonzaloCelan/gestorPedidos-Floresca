package com.floresta.gestor.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.repository.pedidoRepository;
import com.floresta.gestor.repository.ventaRepository;

@Service
public class VentasService {

	
	private final ventaRepository ventaRepository;
	private final pedidoRepository pedidoRepository;
	
	@Autowired
	VentasService(ventaRepository ventaRepository,pedidoRepository pedidoRepository){
		
		this.ventaRepository = ventaRepository;
		this.pedidoRepository = pedidoRepository;
		
	}
	
	@Transactional
	public boolean eliminarVenta(Integer id) {
		
		if (id == null) return false;

	    return ventaRepository.findById(id).map(v -> {
	      Integer pedidoId = v.getIdPedido();// o getIdPedido()
	      pedidoRepository.deleteById(pedidoId);    // ← borra PADRE → cascada borra venta+items
	      return true;
	    }).orElse(false);
	  }
	}
	
	
	

