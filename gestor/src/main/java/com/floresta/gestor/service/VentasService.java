package com.floresta.gestor.service;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.repository.materialRepository;
import com.floresta.gestor.repository.pedidoRepository;
import com.floresta.gestor.repository.ventaRepository;

@Service
public class VentasService {

	
	private final ventaRepository ventaRepository;
	private final pedidoRepository pedidoRepository;
	private final materialRepository materialRepository;
	
	@Autowired
	VentasService(ventaRepository ventaRepository,pedidoRepository pedidoRepository, materialRepository materialRepository){
		
		this.ventaRepository = ventaRepository;
		this.pedidoRepository = pedidoRepository;
		this.materialRepository = materialRepository;
		
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
	
	
	@Transactional
	public double balanceMensual(String mes) {
		
		Double totalMensualVentas = ventaRepository.calcularTotalMensual(mes);
		Double totalMensualMaterial = materialRepository.calcularTotalMensual(mes);
		
		// Evitar nulls si no hay registros
	    double ventas = totalMensualVentas != null ? totalMensualVentas : 0.0;
	    double materiales = totalMensualMaterial != null ? totalMensualMaterial : 0.0;
	    
		return  ventas - materiales;
		
	}
	
	
		
	
	}


	
	
	

