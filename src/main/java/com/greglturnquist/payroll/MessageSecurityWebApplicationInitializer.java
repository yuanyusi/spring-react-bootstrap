package com.greglturnquist.payroll;

import org.springframework.security.web.context.*;

/**
 * No customizations of {@link AbstractSecurityWebApplicationInitializer} are necessary.
 *
 * @author Rob Winch
 */
public class MessageSecurityWebApplicationInitializer extends
		AbstractSecurityWebApplicationInitializer {
	
    public MessageSecurityWebApplicationInitializer() {
        super(SecurityConfiguration.class);
    }
}
