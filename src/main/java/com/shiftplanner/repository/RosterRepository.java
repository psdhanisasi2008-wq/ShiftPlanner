package com.shiftplanner.repository;

import com.shiftplanner.entity.Roster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface RosterRepository extends JpaRepository<Roster, Long> {

    List<Roster> findByEmployeeId(Long employeeId);

    List<Roster> findByWorkDate(LocalDate workDate);

    List<Roster> findByWorkDateBetween(LocalDate start, LocalDate end);

    List<Roster> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    boolean existsByShiftId(Long shiftId);
}