package com.shiftplanner.config;

import com.shiftplanner.entity.Employee;
import com.shiftplanner.entity.Roster;
import com.shiftplanner.entity.Shift;
import com.shiftplanner.enums.Role;
import com.shiftplanner.enums.RosterStatus;
import com.shiftplanner.repository.EmployeeRepository;
import com.shiftplanner.repository.RosterRepository;
import com.shiftplanner.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;

/**
 * Loads sample data on startup, but only when the employees table is empty.
 * The roster is created for the coming Monday to Wednesday.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final RosterRepository rosterRepository;

    @Override
    public void run(String... args) {
        if (employeeRepository.count() > 0) {
            log.info("Sample data skipped: employees already exist.");
            return;
        }

        employee("M001", "Meera Manager", "meera@shiftplanner.local", Role.MANAGER, true);
        Employee arun = employee("E001", "Arun Kumar", "arun@shiftplanner.local", Role.EMPLOYEE, true);
        Employee bala = employee("E002", "Bala Singh", "bala@shiftplanner.local", Role.EMPLOYEE, true);
        Employee chitra = employee("E003", "Chitra Devi", "chitra@shiftplanner.local", Role.EMPLOYEE, true);
        Employee divya = employee("E004", "Divya Rao", "divya@shiftplanner.local", Role.EMPLOYEE, true);
        employee("E005", "Ezhil Mani", "ezhil@shiftplanner.local", Role.EMPLOYEE, false);

        Shift morning = shift("Morning", LocalTime.of(6, 0), LocalTime.of(14, 0));
        Shift evening = shift("Evening", LocalTime.of(14, 0), LocalTime.of(22, 0));
        Shift night = shift("Night", LocalTime.of(22, 0), LocalTime.of(6, 0));

        LocalDate monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDate tuesday = monday.plusDays(1);
        LocalDate wednesday = monday.plusDays(2);

        roster(arun, morning, monday);
        roster(bala, evening, monday);
        roster(chitra, night, monday);
        roster(arun, evening, tuesday);
        roster(bala, morning, tuesday);
        roster(divya, morning, tuesday);
        roster(chitra, morning, wednesday);
        roster(divya, evening, wednesday);

        log.info("Sample data loaded: 6 employees, 3 shifts, 8 roster entries starting {}.", monday);
    }

    private Employee employee(String code, String name, String email, Role role, boolean active) {
        return employeeRepository.save(Employee.builder()
                .employeeCode(code).name(name).email(email).role(role).active(active).build());
    }

    private Shift shift(String name, LocalTime start, LocalTime end) {
        return shiftRepository.save(Shift.builder()
                .shiftName(name).startTime(start).endTime(end).build());
    }

    private void roster(Employee employee, Shift shift, LocalDate date) {
        rosterRepository.save(Roster.builder()
                .employee(employee).shift(shift).workDate(date).status(RosterStatus.ASSIGNED).build());
    }
}