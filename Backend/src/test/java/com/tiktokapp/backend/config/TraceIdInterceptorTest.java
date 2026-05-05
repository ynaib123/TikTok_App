package com.tiktokapp.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that traceId propagation works end-to-end:
 *   1. Inbound X-Request-Id is honoured (carries traceId across the n8n → backend hop).
 *   2. Missing X-Request-Id triggers UUID generation.
 *   3. The same trace id is echoed back in the response header so callers can stitch logs.
 */
class TraceIdInterceptorTest {

    private final TraceIdInterceptor interceptor = new TraceIdInterceptor();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void honoursInboundRequestIdHeader() {
        HttpServletRequest request = mockRequestWithHeader("trace-from-n8n-callback");
        HttpServletResponse response = new MockHttpServletResponse();

        interceptor.preHandle(request, response, new Object());

        assertThat(MDC.get(TraceIdInterceptor.MDC_KEY)).isEqualTo("trace-from-n8n-callback");
        assertThat(response.getHeader(TraceIdInterceptor.HEADER_NAME)).isEqualTo("trace-from-n8n-callback");
    }

    @Test
    void generatesUuidWhenInboundHeaderMissing() {
        HttpServletRequest request = mockRequestWithHeader(null);
        HttpServletResponse response = new MockHttpServletResponse();

        interceptor.preHandle(request, response, new Object());

        String generated = MDC.get(TraceIdInterceptor.MDC_KEY);
        assertThat(generated).isNotBlank();
        assertThat(response.getHeader(TraceIdInterceptor.HEADER_NAME)).isEqualTo(generated);
    }

    @Test
    void afterCompletionClearsMdc() {
        HttpServletRequest request = mockRequestWithHeader("any");
        HttpServletResponse response = new MockHttpServletResponse();

        interceptor.preHandle(request, response, new Object());
        assertThat(MDC.get(TraceIdInterceptor.MDC_KEY)).isNotNull();

        interceptor.afterCompletion(request, response, new Object(), null);
        assertThat(MDC.get(TraceIdInterceptor.MDC_KEY)).isNull();
    }

    @Test
    void contractConstantsAreStable() {
        // If these change, n8n workflow JSON callback Code nodes need to match.
        assertThat(WorkflowContract.HEADER_REQUEST_ID).isEqualTo("X-Request-Id");
        assertThat(WorkflowContract.HEADER_CONTRACT_VERSION).isEqualTo("X-Workflow-Contract-Version");
        assertThat(WorkflowContract.CONTRACT_VERSION).isEqualTo("1");
        assertThat(TraceIdInterceptor.HEADER_NAME).isEqualTo(WorkflowContract.HEADER_REQUEST_ID);
    }

    private static HttpServletRequest mockRequestWithHeader(String value) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (value != null) {
            request.addHeader(TraceIdInterceptor.HEADER_NAME, value);
        }
        return request;
    }
}
