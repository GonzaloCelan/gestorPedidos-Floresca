package com.floresta.gestor.model;



import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "materiales")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Insumo {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_material")
    private Long id;
	
	@Column(name = "fecha",nullable = false)
    private LocalDate fecha;  

    @Column(name = "Insumo",nullable = false)
    private String material;

    @Column(name = "cantidad",nullable = false)
    private Double cantidad;
    
    @Column(name = "proveedor")
    private String proveedor;

    @Column(name = "precio_unitario", nullable = false)
    private BigDecimal precioUnitario;
    
    @Column(name = "precio_total", nullable = false)
    private BigDecimal precioTotal;

   
}
