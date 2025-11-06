package com.floresta.gestor.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.floresta.gestor.dto.venta.VentaResponseDTO;
import com.floresta.gestor.model.Venta;
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
	public boolean eliminarVenta(Long id) {
		
		if (id == null) return false;

	    return ventaRepository.findById(id).map(v -> {
	      Long pedidoId = v.getIdPedido();
	      pedidoRepository.deleteById(pedidoId);   
	      return true;
	    }).orElse(false);
	  }
	
	@Transactional(readOnly = true)
	
	public List<VentaResponseDTO> obtenerVentas() {
		
		var ventas = ventaRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaEntrega"));
		
		List<VentaResponseDTO> items = new ArrayList<>();
		
		for(Venta v : ventas) {
			
			VentaResponseDTO venta =  new VentaResponseDTO (
			v.getIdVenta(),
			v.getIdPedido(),
			v.getCliente(),
			v.getFechaEntrega(),
			v.getTotal(),
			v.getTipoVenta());
			
			items.add(venta);
			
		}
		
		return items;
		
	}
	
	@Transactional
	public double balanceMensual(String mes) {
		
		Double totalMensualVentas = ventaRepository.calcularTotalMensual(mes);
		Double totalMensualMaterial = materialRepository.calcularTotalMensual(mes);
		
		
	    double ventas = totalMensualVentas != null ? totalMensualVentas : 0.0;
	    double materiales = totalMensualMaterial != null ? totalMensualMaterial : 0.0;
	    
		return  ventas - materiales;
		
	}
	
	
		
	
	}


	
	
	

