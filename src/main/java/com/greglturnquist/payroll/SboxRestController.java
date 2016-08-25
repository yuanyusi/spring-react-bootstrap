package com.greglturnquist.payroll;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.PagedResources;
import org.springframework.hateoas.Resource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.ws.rs.core.MediaType;

@RestController
@Component
@RequestMapping(value = "/api/sboxes", produces = {MediaType.APPLICATION_JSON})
public class SboxRestController{

	private final SboxRepository sboxes;
	private final ManagerRepository managers;
	
    @Autowired
    SboxRestController(SboxRepository sboxes, ManagerRepository managers) {
        this.sboxes = sboxes;
        this.managers = managers;
    }
    
    @Autowired PagedResourcesAssembler<Sbox> assembler; 
    
   /* @RequestMapping(method = RequestMethod.GET)
    public  Resources<SboxResource> readSbox() {
		String name = SecurityContextHolder.getContext().getAuthentication().getName();
		Manager createdBy = this.managers.findByName(name);
		
		 List<SboxResource> sboxResourceList = this.sboxes.findByCreatedBy(createdBy)
	                .stream()
	                .map(SboxResource::new)
	                .collect(Collectors.toList());
		return new Resources<SboxResource>(sboxResourceList);
		
	}*/
    
    @RequestMapping(method = RequestMethod.GET)
    public PagedResources<Resource<Sbox>> readSbox(Pageable pageable) {
		String name = SecurityContextHolder.getContext().getAuthentication().getName();
		Manager createdBy = this.managers.findByName(name);
		
		Page<Sbox> sboxResourceList = this.sboxes.findByCreatedBy(createdBy, pageable);
		return assembler.toResource(sboxResourceList);
		
	}

}
