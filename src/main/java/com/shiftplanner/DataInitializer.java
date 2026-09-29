package com.shiftplanner;

import com.shiftplanner.entity.Employee;
import com.shiftplanner.entity.Roster;
import com.shiftplanner.entity.Shift;
import com.shiftplanner.enums.Role;
import com.shiftplanner.enums.RosterStatus;
import com.shiftplanner.repository.EmployeeRepository;
import com.shiftplanner.repository.RosterRepository;
import com.shiftplanner.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final RosterRepository rosterRepository;

    @Override
    public void run(String... args) {
        if (employeeRepository.count() > 0) {
            return;
        }

        Employee arun = employee("EMP001", "Arun", "arun@shiftplanner.com", Role.EMPLOYEE);
        Employee priya = employee("EMP002", "Priya", "priya@shiftplanner.com", Role.EMPLOYEE);
        Employee karthik = employee("EMP003", "Karthik", "karthik@shiftplanner.com", Role.EMPLOYEE);
        employee("MGR001", "Manager", "manager@shiftplanner.com", Role.MANAGER);

        Shift morning = shiftRepository.save(Shift.builder()
                .shiftName("Morning").startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build());
        Shift evening = shiftRepository.save(Shift.builder()
                .shiftName("Evening").startTime(LocalTime.of(14, 0)).endTime(LocalTime.of(22, 0)).build());
        Shift night = shiftRepository.save(Shift.builder()
                .shiftName("Night").startTime(LocalTime.of(22, 0)).endTime(LocalTime.of(6, 0)).build());

        LocalDate d1 = LocalDate.of(2026, 10, 5);
        LocalDate d2 = LocalDate.of(2026, 10, 6);
        LocalDate d3 = LocalDate.of(2026, 10, 7);

        roster(arun, morning, d1);
        roster(priya, evening, d1);
        roster(karthik, night, d1);
        roster(arun, morning, d2);
        roster(priya, morning, d2);
        roster(karthik, evening, d2);
        roster(arun, evening, d3);
        roster(priya, night, d3);
        roster(karthik, morning, d3);
    }

    private Employee employee(String code, String name, String email, Role role) {
        return employeeRepository.save(Employee.builder()
                .employeeCode(code).name(name).email(email).role(role).active(true).build());
    }

    private void roster(Employee employee, Shift shift, LocalDate date) {
        rosterRepository.save(Roster.builder()
                .employee(employee).shift(shift).workDate(date).status(RosterStatus.ASSIGNED).build());
    }
}