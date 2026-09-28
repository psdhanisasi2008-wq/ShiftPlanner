package com.shiftplanner.dto;

import com.shiftplanner.enums.Role;

import java.time.LocalDateTime;

public record EmployeeResponse(
        Long id,
        String employeeCode,
        String name,
        String email,
        Role role,
        boolean active,
        LocalDateTime createdAt
) {
}