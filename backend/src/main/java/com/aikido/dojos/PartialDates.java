package com.aikido.dojos;

import jakarta.validation.constraints.Pattern;
import java.lang.annotation.*;

/** Dates may be partial: YYYY, YYYY-MM or YYYY-MM-DD (ISO strings sort chronologically). */
public final class PartialDates {
    public static final String REGEX = "\\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\\d|3[01]))?)?";

    @Target({ElementType.PARAMETER, ElementType.FIELD})
    @Retention(RetentionPolicy.RUNTIME)
    @Pattern(regexp = REGEX, message = "must be YYYY, YYYY-MM or YYYY-MM-DD")
    @jakarta.validation.Constraint(validatedBy = {})
    public @interface Valid {
        String message() default "must be YYYY, YYYY-MM or YYYY-MM-DD";
        Class<?>[] groups() default {};
        Class<? extends jakarta.validation.Payload>[] payload() default {};
    }

    private PartialDates() {}

    /** Compares only the precision both dates share, so "2009" is not before "2009-05". */
    public static boolean isBefore(String a, String b) {
        int n = Math.min(a.length(), b.length());
        return a.substring(0, n).compareTo(b.substring(0, n)) < 0;
    }
}
