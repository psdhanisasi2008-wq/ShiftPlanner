package com.shiftplanner.dto;

import com.shiftplanner.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EmployeeRequest(
        @NotBlank(message = "Employee code is required") String employeeCode,
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Email is required") @Email(message = "Email must be valid") String email,
        @NotNull(message = "Role is required") Role role,
        Boolean active
) {
}