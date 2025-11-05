package com.floresta.gestor.dto.insumo;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;



public record InsumoNuevoDTO(

	    @NotNull
	    @FutureOrPresent
	    LocalDate fecha,

	    @NotNull
	    @Min(value = 1, message = "La cantidad mínima es 1")
	    Double cantidad,

	    String proveedor,

	    @NotNull
	    @PositiveOrZero
	    BigDecimal precioUnitario,

	    @NotNull
	    @PositiveOrZero
	    BigDecimal precioTotal
	) {}