package com.shiftplanner.service;

import com.shiftplanner.dto.EmployeeRequest;
import com.shiftplanner.dto.EmployeeResponse;
import com.shiftplanner.entity.Employee;
import com.shiftplanner.exception.DuplicateResourceException;
import com.shiftplanner.exception.ResourceNotFoundException;
import com.shiftplanner.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        if (employeeRepository.existsByEmployeeCode(request.employeeCode())) {
            throw new DuplicateResourceException(
                    "Employee code already exists: " + request.employeeCode());
        }
        if (employeeRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException(
                    "Email already exists: " + request.email());
        }

        Employee employee = Employee.builder()
                .employeeCode(request.employeeCode())
                .name(request.name())
                .email(request.email())
                .role(request.role())
                .active(request.active() == null || request.active())
                .build();

        return toResponse(employeeRepository.save(employee));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployee(Long id) {
        return toResponse(findEmployee(id));
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getAllEmployees() {
        return employeeRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EmployeeResponse updateEmployee(Long id, EmployeeRequest request) {
        Employee employee = findEmployee(id);

        if (employeeRepository.existsByEmployeeCodeAndIdNot(request.employeeCode(), id)) {
            throw new DuplicateResourceException(
                    "Employee code already exists: " + request.employeeCode());
        }
        if (employeeRepository.existsByEmailAndIdNot(request.email(), id)) {
            throw new DuplicateResourceException(
                    "Email already exists: " + request.email());
        }

        employee.setEmployeeCode(request.employeeCode());
        employee.setName(request.name());
        employee.setEmail(request.email());
        employee.setRole(request.role());
        if (request.active() != null) {
            employee.setActive(request.active());
        }

        return toResponse(employeeRepository.save(employee));
    }

    @Transactional
    public EmployeeResponse deactivateEmployee(Long id) {
        Employee employee = findEmployee(id);
        employee.setActive(false);
        return toResponse(employeeRepository.save(employee));
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Employee not found with id: " + id));
    }

    private EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getName(),
                employee.getEmail(),
                employee.getRole(),
                employee.isActive(),
                employee.getCreatedAt());
    }
}