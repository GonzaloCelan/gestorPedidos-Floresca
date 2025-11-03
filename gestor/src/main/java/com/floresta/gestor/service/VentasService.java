package com.floresta.gestor.service;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.repository.InsumoRepository;
import com.floresta.gestor.repository.PedidoRepository;
import com.floresta.gestor.repository.VentaRepository;

@Service
public class VentasService {

	
	private final VentaRepository ventaRepository;
	private final PedidoRepository pedidoRepository;
	private final InsumoRepository materialRepository;
	
	@Autowired
	VentasService(VentaRepository ventaRepository,PedidoRepository pedidoRepository, InsumoRepository materialRepository){
		
		this.ventaRepository = ventaRepository;
		this.pedidoRepository = pedidoRepository;
		this.materialRepository = materialRepository;
		
	}
	
	@Transactional
	public boolean eliminarVenta(Integer id) {
		
		if (id == null) return false;

	    return ventaRepository.findById(id).map(v -> {
	      Integer pedidoId = v.getIdPedido();// o getIdPedido()
	      pedidoRepository.deleteById(pedidoId);    // ← borra PADRE → cascada borra Venta+items
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


	
	
	

