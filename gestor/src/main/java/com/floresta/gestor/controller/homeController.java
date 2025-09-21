package com.floresta.gestor.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/api/gestor")
public class homeController {

	
	@GetMapping("/inicio")
    public String home() {
        return "index"; // busca templates/index.html (sin la extensión)
    }
}
