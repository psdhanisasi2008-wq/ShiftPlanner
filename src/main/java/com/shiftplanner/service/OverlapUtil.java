package com.shiftplanner.service;

import com.shiftplanner.entity.Shift;

import java.time.LocalTime;

/**
 * Time-overlap check for two shifts on the same work date.
 * A shift whose end time is before its start time (for example 22:00-06:00)
 * is treated as ending after midnight.
 */
public final class OverlapUtil {

    private static final int MINUTES_PER_DAY = 24 * 60;

    private OverlapUtil() {
    }

    public static boolean overlaps(Shift a, Shift b) {
        int aStart = minutes(a.getStartTime());
        int aEnd = endMinutes(a);
        int bStart = minutes(b.getStartTime());
        int bEnd = endMinutes(b);
        return aStart < bEnd && bStart < aEnd;
    }

    private static int minutes(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private static int endMinutes(Shift shift) {
        int start = minutes(shift.getStartTime());
        int end = minutes(shift.getEndTime());
        return end > start ? end : end + MINUTES_PER_DAY;
    }
}