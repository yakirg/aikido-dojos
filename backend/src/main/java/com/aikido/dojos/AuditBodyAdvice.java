package com.aikido.dojos;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Type;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Keeps the parsed request body so admin edits can be audited with readable names. */
@ControllerAdvice
class AuditBodyAdvice extends RequestBodyAdviceAdapter {
    private final ObjectMapper om;

    AuditBodyAdvice(ObjectMapper om) {
        this.om = om;
    }

    @Override
    public boolean supports(MethodParameter p, Type t, Class<? extends HttpMessageConverter<?>> c) {
        return true;
    }

    @Override
    public Object afterBodyRead(Object body, HttpInputMessage in, MethodParameter p, Type t,
                                Class<? extends HttpMessageConverter<?>> c) {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes sra) {
            HttpServletRequest req = sra.getRequest();
            if (req.getAttribute(PendingEditInterceptor.ADMIN_EDIT) != null) {
                req.setAttribute(PendingEditInterceptor.BODY, om.valueToTree(body));
            }
        }
        return body;
    }
}
