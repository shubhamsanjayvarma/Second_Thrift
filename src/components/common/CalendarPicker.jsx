import { useState, useRef, useEffect, useMemo } from 'react';
import { FiCalendar, FiClock, FiChevronLeft, FiChevronRight, FiX, FiCheck } from 'react-icons/fi';
import './CalendarPicker.css';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Pads a number with leading zero.
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Format a Date object to YYYY-MM-DDTHH:mm
 */
const toDateTimeLocalString = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
};

/**
 * Format date for friendly human display
 */
const formatHumanDisplay = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
        dateFormatted: `${dayName}, ${day} ${month} ${year}`,
        timeFormatted: time,
        fullFormatted: `${day} ${month} ${year}, ${time}`,
    };
};

export const CalendarPicker = ({
    value,
    onChange,
    label,
    placeholder = 'Select date & time...',
    type = 'start', // 'start' | 'expiry'
    align = 'auto',
    minDate = null,
}) => {
    const isRightAligned = align === 'right' || (align === 'auto' && type === 'expiry');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Parse incoming value or fallback to now
    const parsedDate = useMemo(() => {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }, [value]);

    // Active calendar viewing month & year (0-indexed month)
    const [viewYear, setViewYear] = useState(() => (parsedDate ? parsedDate.getFullYear() : new Date().getFullYear()));
    const [viewMonth, setViewMonth] = useState(() => (parsedDate ? parsedDate.getMonth() : new Date().getMonth()));

    // Time states
    const [selectedHours, setSelectedHours] = useState(() => {
        if (parsedDate) return parsedDate.getHours();
        return type === 'expiry' ? 23 : 0;
    });

    const [selectedMinutes, setSelectedMinutes] = useState(() => {
        if (parsedDate) return parsedDate.getMinutes();
        return type === 'expiry' ? 59 : 0;
    });

    // When value prop changes externally, sync view
    useEffect(() => {
        if (parsedDate) {
            setViewYear(parsedDate.getFullYear());
            setViewMonth(parsedDate.getMonth());
            setSelectedHours(parsedDate.getHours());
            setSelectedMinutes(parsedDate.getMinutes());
        }
    }, [parsedDate]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Navigation handlers
    const prevMonth = (e) => {
        e.stopPropagation();
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const nextMonth = (e) => {
        e.stopPropagation();
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const jumpToToday = (e) => {
        e.stopPropagation();
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        handleSelectDay(now.getFullYear(), now.getMonth(), now.getDate());
    };

    // Selecting a day on calendar grid
    const handleSelectDay = (year, month, day) => {
        const newDate = new Date(year, month, day, selectedHours, selectedMinutes, 0);
        onChange(toDateTimeLocalString(newDate));
    };

    // Updating time
    const handleTimeChange = (h, m) => {
        setSelectedHours(h);
        setSelectedMinutes(m);
        const base = parsedDate || new Date(viewYear, viewMonth, new Date().getDate());
        const updated = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);
        onChange(toDateTimeLocalString(updated));
    };

    // Presets
    const applyPreset = (daysToAdd, setEndDay = false) => {
        const target = new Date();
        target.setDate(target.getDate() + daysToAdd);
        if (setEndDay) {
            target.setHours(23, 59, 0, 0);
            setSelectedHours(23);
            setSelectedMinutes(59);
        } else {
            target.setHours(selectedHours, selectedMinutes, 0, 0);
        }
        setViewYear(target.getFullYear());
        setViewMonth(target.getMonth());
        onChange(toDateTimeLocalString(target));
    };

    const applyEndOfMonth = () => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 0, 0);
        setSelectedHours(23);
        setSelectedMinutes(59);
        setViewYear(lastDay.getFullYear());
        setViewMonth(lastDay.getMonth());
        onChange(toDateTimeLocalString(lastDay));
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
    };

    // Calendar grid generation
    const calendarDays = useMemo(() => {
        const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        const cells = [];

        // Previous month trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            cells.push({
                day: dayNum,
                month: viewMonth === 0 ? 11 : viewMonth - 1,
                year: viewMonth === 0 ? viewYear - 1 : viewYear,
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let i = 1; i <= daysInCurrentMonth; i++) {
            cells.push({
                day: i,
                month: viewMonth,
                year: viewYear,
                isCurrentMonth: true,
            });
        }

        // Next month leading days (to complete 35 or 42 grid cells)
        const totalRows = cells.length > 35 ? 42 : 35;
        const remaining = totalRows - cells.length;
        for (let i = 1; i <= remaining; i++) {
            cells.push({
                day: i,
                month: viewMonth === 11 ? 0 : viewMonth + 1,
                year: viewMonth === 11 ? viewYear + 1 : viewYear,
                isCurrentMonth: false,
            });
        }

        return cells;
    }, [viewYear, viewMonth]);

    const human = formatHumanDisplay(value);
    const today = new Date();

    return (
        <div className="cal-picker-wrapper" ref={wrapperRef}>
            {label && (
                <label className="cal-picker-label">
                    {label}
                </label>
            )}

            {/* Clickable Trigger Box */}
            <div
                className={`cal-picker-trigger ${isOpen ? 'active' : ''} ${value ? 'has-value' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
            >
                <div className="cal-picker-trigger-left">
                    <span className="cal-picker-icon-badge">
                        <FiCalendar />
                    </span>
                    {human ? (
                        <div className="cal-picker-selected-text">
                            <span className="cal-picker-date-text">{human.dateFormatted}</span>
                            <span className="cal-picker-time-text">at {human.timeFormatted}</span>
                        </div>
                    ) : (
                        <span className="cal-picker-placeholder">{placeholder}</span>
                    )}
                </div>

                <div className="cal-picker-trigger-right">
                    {value && (
                        <button
                            type="button"
                            className="cal-picker-clear-btn"
                            title="Clear date"
                            onClick={handleClear}
                        >
                            <FiX size={14} />
                        </button>
                    )}
                    <span className="cal-picker-action-tag">
                        {isOpen ? 'Close' : 'Pick Date'}
                    </span>
                </div>
            </div>

            {/* Interactive Calendar Popover */}
            {isOpen && (
                <div className={`cal-picker-popover ${isRightAligned ? 'align-right' : 'align-left'}`} onClick={(e) => e.stopPropagation()}>
                    {/* Header Presets */}
                    <div className="cal-picker-presets">
                        {type === 'start' ? (
                            <>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(0)}>Today</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(1)}>Tomorrow</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(3)}>In 3 Days</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(7)}>Next Week</button>
                            </>
                        ) : (
                            <>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(3, true)}>+3 Days</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(7, true)}>+7 Days</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(14, true)}>+14 Days</button>
                                <button type="button" className="cal-preset-btn" onClick={() => applyPreset(30, true)}>+30 Days</button>
                                <button type="button" className="cal-preset-btn" onClick={applyEndOfMonth}>End of Month</button>
                            </>
                        )}
                    </div>

                    {/* Month / Year Bar */}
                    <div className="cal-picker-nav-bar">
                        <button type="button" className="cal-nav-btn" onClick={prevMonth} title="Previous Month">
                            <FiChevronLeft size={16} />
                        </button>
                        <div className="cal-current-month-year">
                            <span className="cal-month-name">{MONTH_NAMES[viewMonth]}</span>
                            <span className="cal-year-num">{viewYear}</span>
                        </div>
                        <div className="cal-nav-right-group">
                            <button type="button" className="cal-today-btn" onClick={jumpToToday}>Today</button>
                            <button type="button" className="cal-nav-btn" onClick={nextMonth} title="Next Month">
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Day of Week Labels */}
                    <div className="cal-weekdays-row">
                        {DAYS_SHORT.map((day, idx) => (
                            <div key={idx} className="cal-weekday-cell">{day}</div>
                        ))}
                    </div>

                    {/* Calendar Month Grid */}
                    <div className="cal-days-grid">
                        {calendarDays.map((cell, idx) => {
                            const isToday = today.getDate() === cell.day &&
                                today.getMonth() === cell.month &&
                                today.getFullYear() === cell.year;

                            const isSelected = parsedDate &&
                                parsedDate.getDate() === cell.day &&
                                parsedDate.getMonth() === cell.month &&
                                parsedDate.getFullYear() === cell.year;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`cal-day-cell ${cell.isCurrentMonth ? 'current-month' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                    onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                                >
                                    <span>{cell.day}</span>
                                    {isToday && <span className="cal-today-indicator" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time Selector Bar */}
                    <div className="cal-time-bar">
                        <div className="cal-time-label">
                            <FiClock size={14} style={{ color: '#fcc419' }} />
                            <span>Time:</span>
                        </div>
                        <div className="cal-time-inputs">
                            <select
                                className="cal-time-select"
                                value={selectedHours}
                                onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), selectedMinutes)}
                            >
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <option key={h} value={h}>
                                        {pad(h)}:00 ({h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`})
                                    </option>
                                ))}
                            </select>
                            <span className="cal-time-sep">:</span>
                            <select
                                className="cal-time-select"
                                value={selectedMinutes}
                                onChange={(e) => handleTimeChange(selectedHours, parseInt(e.target.value, 10))}
                            >
                                <option value={0}>00 min</option>
                                <option value={15}>15 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={59}>59 min (End of hr)</option>
                            </select>
                        </div>
                        <div className="cal-time-shortcuts">
                            <button
                                type="button"
                                className="cal-preset-btn"
                                onClick={() => handleTimeChange(0, 0)}
                                title="00:00 (Midnight)"
                            >
                                00:00
                            </button>
                            <button
                                type="button"
                                className="cal-preset-btn"
                                onClick={() => handleTimeChange(23, 59)}
                                title="23:59 (End of Day)"
                            >
                                23:59
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="cal-picker-footer">
                        {value ? (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleClear}
                                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                            >
                                Clear
                            </button>
                        ) : <div />}
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setIsOpen(false)}
                            style={{ fontSize: '0.75rem', padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            <FiCheck size={14} /> Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPicker;
