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
import com.floresta.gestor.dto.pedido.PedidoActualizadoDTO;
import com.floresta.gestor.dto.pedido.PedidoCreadoDTO;
import com.floresta.gestor.dto.pedido.PedidoDatosDTO;
import com.floresta.gestor.dto.pedido.PedidoEstadoDTO;
import com.floresta.gestor.dto.pedido.PedidoNuevoDTO;
import com.floresta.gestor.dto.pedido.PedidoResponseDTO;
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
	public PedidoCreadoDTO generarPedido(@Valid PedidoNuevoDTO request) {
		
		String estado = request.estado() == null ? "PENDIENTE" : request.estado();
		
		Pedido nuevoPedido = Pedido.builder()
				.cliente(request.cliente())
				.fechaEntrega(request.fechaEntrega())
				.estado(request.estado())
				.total(BigDecimal.ZERO)
				.tipoVenta(request.tipoVenta())
				.build();
	
		
		BigDecimal total = BigDecimal.ZERO;
		
		nuevoPedido = pedidoRepository.save(nuevoPedido);
		  
		for (ProductoDTO p : request.items()) {
			
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
		  
		  
		  return new PedidoCreadoDTO(
				  nuevoPedido.getIdPedido(),
				  nuevoPedido.getTipoVenta()
				  );
		
	}
	
	
	
	@Transactional
	public PedidoEstadoDTO actualizarEstado(Long id, String nuevoEstado) {
        
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
		
		return new PedidoEstadoDTO(
				pedido.getIdPedido(),
				estadoAnterior,
				nuevoEstado
				);
	}
	
	@Transactional
	public Pedido actualizarPedido(Long id, @Valid PedidoActualizadoDTO request) {
        
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
	public boolean eliminarEntrega(Long id) {
		
		if (!pedidoRepository.existsById(id)) return false; 

		  try {
			  pedidoRepository.deleteById(id);
		    return true;
		  } catch (org.springframework.dao.DataIntegrityViolationException e) {
		    return false; 
		  }
	}
	
	@Transactional(readOnly = true) 
	public List<ProductoDTO> obtenerProductosById(Long id){
		
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
	
	public PedidoDatosDTO obtenerPedidoById(Long id){
		
		Pedido pedido = pedidoRepository.findById(id).orElseThrow(() -> new ResponseStatusException( NOT_FOUND,"Entrega " + id + " no existe"));
	    
		return new PedidoDatosDTO(
		        pedido.getCliente(),
		        pedido.getFechaEntrega(),
		        pedido.getEstado(),
		        pedido.getTipoVenta()
		    );
	}
	
	
	@Transactional(readOnly = true) 
    public List<PedidoResponseDTO> obtenerPedidosActivos() {
    	
		List<PedidoResponseDTO> listaPedidos = new ArrayList<>();
				
		var pedidos = pedidoRepository.findByEstadoInAndTipoVenta(
    		        List.of("PENDIENTE", "EN_PROCESO","ENTREGADO"),
    		        "Pedido"
    		    );
    	  
		for (Pedido p : pedidos) {
			
			PedidoResponseDTO pedido = new PedidoResponseDTO(
					p.getIdPedido(),
					p.getCliente(),
					p.getFechaEntrega(),
					p.getEstado(),
					p.getTotal(),
					p.getTipoVenta()
					);
			
			listaPedidos.add(pedido);
		}
    	return listaPedidos;
    }
	
}
