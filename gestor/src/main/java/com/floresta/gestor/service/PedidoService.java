package com.floresta.gestor.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.floresta.gestor.dto.ProductoDTO;
import com.floresta.gestor.dto.PedidoDTO;
import com.floresta.gestor.dto.PedidoDatosDTO;
import com.floresta.gestor.dto.PedidoUpdateDTO;
import com.floresta.gestor.model.ProductoItem;
import com.floresta.gestor.model.Pedido;
import com.floresta.gestor.model.Venta;

import com.floresta.gestor.repository.PedidoRepository;
import com.floresta.gestor.repository.ProductoRepository;
import com.floresta.gestor.repository.VentaRepository;


import jakarta.validation.Valid;

@Service
public class PedidoService {

	
	private final PedidoRepository pedidoRepository;
	private final VentaRepository ventaRepository;
	private final ProductoRepository productRepository;
	
	@Autowired
	PedidoService(PedidoRepository repository,VentaRepository ventaRepository,ProductoRepository productRepository){
		this.pedidoRepository = repository;
		this.ventaRepository = ventaRepository;
		this.productRepository = productRepository;
	}
	
	
	@Transactional
	public Pedido generarPedido(@Valid PedidoDTO request) {
		
		if (request.getEstado() == null) request.setEstado("PENDIENTE");
		
		var nuevoPedido = Pedido.builder()
				.cliente(request.getCliente())
				.fechaEntrega(request.getFechaEntrega())
				.estado(request.getEstado())
				.total(BigDecimal.ZERO)
				.tipoVenta(request.getTipoVenta())
				.build();
	
		
		BigDecimal total = BigDecimal.ZERO;
		
		nuevoPedido = pedidoRepository.save(nuevoPedido);
		  
		for (ProductoDTO p : request.getItems()) {
			
			ProductoItem producto = ProductoItem.builder()
					.idPedido(nuevoPedido.getIdPedido())
					.productoNombre(p.getProducto())
					.cantidad(p.getCantidad())
					.precioUnit(p.getPrecioUnitario())
					.subtotal(p.getSubTotal())
					.build();
			
			productRepository.save(producto);
			
			total = total.add(p.getSubTotal());
			
		}
		
		
		
			nuevoPedido.setTotal(total);
		  pedidoRepository.save(nuevoPedido);
		  
		  if ("ENTREGADO".equalsIgnoreCase(nuevoPedido.getEstado())) {
		        Venta v = Venta.builder()
		                .cliente(nuevoPedido.getCliente())
		                .fechaEntrega(nuevoPedido.getFechaEntrega())
		                .total(nuevoPedido.getTotal())
		                .tipoVenta(nuevoPedido.getTipoVenta()) // "Pedido" | "Directo" | "Otro"
		                .idPedido(nuevoPedido.getIdPedido())   // FK al Pedido
		                .build();
		        ventaRepository.save(v);
		    }
		  
		  return nuevoPedido;
		
	}
	
	
	
	@Transactional
	public Pedido actualizarEstado(Integer id, String nuevoEstado) {
        
		Pedido pedido = pedidoRepository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Entrega " + id + " no existe"));
    
		var estadoAnterior = pedido.getEstado();
		pedido.setEstado(nuevoEstado);
		pedidoRepository.save(pedido);
		
		if("ENTREGADO".equalsIgnoreCase(nuevoEstado) && !"ENTREGADO".equalsIgnoreCase(estadoAnterior)) { 
			
			Venta guardarVenta = Venta.builder()
					.cliente(pedido.getCliente())
					.fechaEntrega(pedido.getFechaEntrega())
					.total(pedido.getTotal())
					.tipoVenta(pedido.getTipoVenta())
					.idPedido(pedido.getIdPedido())
					.build();
					  
			
			ventaRepository.save(guardarVenta);
		}
		
		return pedido;
	}
	
	@Transactional
	public Pedido actualizarPedido(Integer id, @Valid PedidoUpdateDTO request) {
        
		Pedido ped = pedidoRepository.findById(id)
		        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Entrega " + id + " no existe"));

		    // ====== actualizar cabecera (solo si viene valor) ======
		    if (request.getCliente() != null) ped.setCliente(request.getCliente());
		    if (request.getFechaEntrega() != null) ped.setFechaEntrega(request.getFechaEntrega());
		    if (request.getTipoVenta() != null) ped.setTipoVenta(request.getTipoVenta());
		    if (request.getEstado() != null) ped.setEstado(request.getEstado());

		    HttpStatusCode BAD_REQUEST;
			// reglas por tipo de Venta
		    if ("Pedido".equalsIgnoreCase(ped.getTipoVenta())) {
		        if (ped.getEstado() == null) ped.setEstado("PENDIENTE");
		        if (ped.getFechaEntrega() == null)
		            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fechaEntrega es requerida para tipo Pedido");
		    } else {
		        // Directo / Otro: podés fijar estado entregado si querés
		        if (ped.getEstado() == null) ped.setEstado("ENTREGADO");
		        if (ped.getFechaEntrega() == null) ped.setFechaEntrega(LocalDate.now());
		    }

		    ped = pedidoRepository.save(ped); 

		    if (request.getItems() != null) {
		    	
		    	productRepository.deleteByIdPedido(ped.getIdPedido());

		        BigDecimal total = BigDecimal.ZERO;

		        for (ProductoDTO p : request.getItems()) {
		            if (p.getCantidad() == null || p.getCantidad() < 1)
		                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cantidad inválida para " + p.getProducto());
		            if (p.getPrecioUnitario() == null || p.getPrecioUnitario().signum() < 0)
		                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Precio inválido para " + p.getProducto());

		            BigDecimal subtotal = p.getPrecioUnitario()
		                    .multiply(BigDecimal.valueOf(p.getCantidad()))
		                    .setScale(2);

		            var item = ProductoItem.builder()
		                    .idPedido(ped.getIdPedido())        
		                    .productoNombre(p.getProducto())
		                    .cantidad(p.getCantidad())
		                    .precioUnit(p.getPrecioUnitario())
		                    .subtotal(subtotal)
		                    .build();

		            productRepository.save(item);
		            total = total.add(subtotal);
		        }

		        ped.setTotal(total);
		        pedidoRepository.save(ped);
		    }

		    return ped;
    
	}
	
	@Transactional
	public boolean eliminarEntrega(Integer id) {
		
		if (!pedidoRepository.existsById(id)) return false; 

		  try {
			  pedidoRepository.deleteById(id);
		    return true;
		  } catch (org.springframework.dao.DataIntegrityViolationException e) {
		    return false; 
		  }
	}
	
	@Transactional(readOnly = true) 
	public List<ProductoDTO> obtenerProductosById(Integer id){
		
		List<ProductoItem> listaProductos = productRepository.findItemsByPedidoId(id);

		List<ProductoDTO> items = new ArrayList<>();
		
	    for (ProductoItem p : listaProductos) {
	        items.add(new ProductoDTO(
	            p.getProductoNombre(),   // <-- usa tus getters reales
	            p.getCantidad(),
	            p.getPrecioUnit(),       // o getPrecioUnitario()
	            p.getSubtotal()          // NO lo recalculo
	        ));
	    }
	    return items;
	}
	
	@Transactional(readOnly = true) 
	
	public PedidoDatosDTO obtenerPedidoById(Integer id){
		
		Pedido pedido = pedidoRepository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Entrega " + id + " no existe"));
	    
		 var p = PedidoDatosDTO.builder()
				.cliente(pedido.getCliente())
				.fechaEntrega(pedido.getFechaEntrega())
				.estado(pedido.getEstado())
				.tipoVenta(pedido.getTipoVenta())
				.build();
				
				
		 return p;
	}
	
	
	@Transactional(readOnly = true) 
    public List<Pedido> obtenerPedidosActivos() {
    	
    	  return pedidoRepository.findByEstadoInAndTipoVenta(
    		        List.of("PENDIENTE", "EN_PROCESO","ENTREGADO"),
    		        "Pedido"
    		    );
    }
	
}
