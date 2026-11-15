#!/usr/bin/env python3
"""Download the hall Outlook calendar and write busy dates only.

The public website shows a month view from data/busy-dates.json. This script
is meant to run in GitHub Actions (and can be run locally). It never writes
event titles, locations, descriptions, or UIDs — only YYYY-MM-DD dates and
a generated timestamp.

Hall events often appear in Outlook as Free/Transparent (community events).
Those still occupy the hall, so every non-cancelled event is treated as busy
for rental availability.

Usage:
  OUTLOOK_ICS_URL=... python scripts/sync-busy-dates.py
  python scripts/sync-busy-dates.py --url URL --output data/busy-dates.json
  python scripts/sync-busy-dates.py --self-test
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta
from icalendar import Calendar
import recurring_ical_events

HALL_TZ = ZoneInfo("America/Los_Angeles")
BUSY_KEYS = ("generated", "busy")
DATE_FMT = "%Y-%m-%d"


def today_in_hall() -> date:
    return datetime.now(HALL_TZ).date()


def window(now: date) -> tuple[date, date]:
    """From the first day of the current month through ~12 months ahead."""
    start = now.replace(day=1)
    end = start + relativedelta(months=13)  # exclusive upper bound
    return start, end


def as_hall_datetime(value, default_tz=HALL_TZ) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=default_tz)
        return value.astimezone(HALL_TZ)
    raise TypeError(f"expected datetime, got {type(value)}")


def dates_for_occurrence(start, end) -> list[date]:
    """Return every hall-local calendar date an occurrence occupies.

    All-day DTEND is treated as exclusive (ICS standard). A timed event that
    ends at exactly midnight is also exclusive of that date. Otherwise the
    end date is included, so an event from Dec 31 6pm to Jan 1 1am marks both
    days as busy.
    """
    if isinstance(start, datetime):
        start_dt = as_hall_datetime(start)
        if end is None:
            return [start_dt.date()]
        if isinstance(end, datetime):
            end_dt = as_hall_datetime(end)
        elif isinstance(end, date):
            # Unusual mixed type: treat date end as exclusive all-day bound
            dates = []
            cur = start_dt.date()
            while cur < end:
                dates.append(cur)
                cur += timedelta(days=1)
            return dates or [start_dt.date()]
        else:
            return [start_dt.date()]
        first = start_dt.date()
        if end_dt.time() == time.min:
            last = end_dt.date() - timedelta(days=1)
        else:
            last = end_dt.date()
        if last < first:
            last = first
        dates = []
        cur = first
        while cur <= last:
            dates.append(cur)
            cur += timedelta(days=1)
        return dates

    # All-day: date values, DTEND exclusive
    if isinstance(start, date):
        first = start
        if end is None:
            return [first]
        if isinstance(end, datetime):
            last_exclusive = as_hall_datetime(end).date()
        elif isinstance(end, date):
            last_exclusive = end
        else:
            return [first]
        dates = []
        cur = first
        while cur < last_exclusive:
            dates.append(cur)
            cur += timedelta(days=1)
        return dates or [first]

    return []


def component_status(component) -> str:
    value = component.get("STATUS")
    if value is None:
        return ""
    return str(value).upper()


def occurrence_bounds(component) -> tuple[datetime | date, datetime | date | None]:
    start_prop = component.get("DTSTART")
    if start_prop is None:
        raise ValueError("event missing DTSTART")
    start = start_prop.dt
    end_prop = component.get("DTEND")
    if end_prop is not None:
        return start, end_prop.dt
    duration = component.get("DURATION")
    if duration is not None and hasattr(duration, "dt"):
        return start, start + duration.dt
    if isinstance(start, datetime):
        return start, start
    return start, start + timedelta(days=1)


def busy_dates_from_calendar(calendar: Calendar, start: date, end: date) -> list[str]:
    # between() end is exclusive
    start_dt = datetime.combine(start, time.min, tzinfo=HALL_TZ)
    end_dt = datetime.combine(end, time.min, tzinfo=HALL_TZ)
    busy: set[date] = set()
    for component in recurring_ical_events.of(calendar).between(start_dt, end_dt):
        if component_status(component) == "CANCELLED":
            continue
        try:
            occ_start, occ_end = occurrence_bounds(component)
        except (ValueError, TypeError):
            continue
        for day in dates_for_occurrence(occ_start, occ_end):
            if start <= day < end:
                busy.add(day)
    return [d.strftime(DATE_FMT) for d in sorted(busy)]


def fetch_ics(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "BJMHallAvailabilitySync/1.0"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not download the hall calendar: {exc.reason}") from exc
    if not data:
        raise SystemExit("Downloaded calendar was empty.")
    return data


def parse_calendar(ics_bytes: bytes) -> Calendar:
    try:
        calendar = Calendar.from_ical(ics_bytes)
    except Exception as exc:  # noqa: BLE001 - surface parse errors clearly
        raise SystemExit(f"Could not parse the hall calendar: {exc}") from exc
    return calendar


def payload(busy: list[str], generated: datetime | None = None) -> dict:
    stamp = (generated or datetime.now(tz=ZoneInfo("UTC"))).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"generated": stamp, "busy": busy}


def write_if_changed(path: Path, data: dict) -> bool:
    """Write JSON if the busy list changed. Return True if the file was written."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = None
        if isinstance(existing, dict) and existing.get("busy") == data["busy"]:
            return False
    text = json.dumps(data, indent=2, ensure_ascii=True) + "\n"
    path.write_text(text, encoding="utf-8")
    return True


def validate_payload(data: dict) -> None:
    extra = set(data) - set(BUSY_KEYS)
    if extra:
        raise SystemExit(f"Refusing to write unexpected keys: {sorted(extra)}")
    if set(data) != set(BUSY_KEYS):
        raise SystemExit("Payload must contain only 'generated' and 'busy'.")
    if not isinstance(data["busy"], list) or not all(
        isinstance(item, str) and _valid_date(item) for item in data["busy"]
    ):
        raise SystemExit("Busy list must be YYYY-MM-DD strings only.")


def _valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, DATE_FMT)
    except ValueError:
        return False
    return len(value) == 10


def run_self_test() -> int:
    ics = b"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BJM Hall//self-test//EN
BEGIN:VTIMEZONE
TZID:Pacific Standard Time
BEGIN:STANDARD
DTSTART:16010101T020000
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=1SU;BYMONTH=11
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:16010101T020000
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=2SU;BYMONTH=3
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:all-day-exclusive-end
DTSTART;VALUE=DATE:20261206
DTEND;VALUE=DATE:20261207
SUMMARY:Must not appear in output
LOCATION:Must not appear
DESCRIPTION:Must not appear
TRANSP:TRANSPARENT
X-MICROSOFT-CDO-BUSYSTATUS:FREE
END:VEVENT
BEGIN:VEVENT
UID:overnight-timed
DTSTART;TZID=Pacific Standard Time:20261231T180000
DTEND;TZID=Pacific Standard Time:20270101T010000
SUMMARY:Must not appear in output
END:VEVENT
BEGIN:VEVENT
UID:ends-at-midnight
DTSTART;TZID=Pacific Standard Time:20270115T180000
DTEND;TZID=Pacific Standard Time:20270116T000000
SUMMARY:Must not appear in output
END:VEVENT
BEGIN:VEVENT
UID:utc-timed
DTSTART:20270213T040000Z
DTEND:20270213T070000Z
SUMMARY:Must not appear in output
END:VEVENT
BEGIN:VEVENT
UID:two-day-festa
DTSTART;VALUE=DATE:20270515
DTEND;VALUE=DATE:20270517
SUMMARY:Must not appear in output
END:VEVENT
BEGIN:VEVENT
UID:cancelled-should-skip
DTSTART;VALUE=DATE:20270301
DTEND;VALUE=DATE:20270302
STATUS:CANCELLED
SUMMARY:Must not appear in output
END:VEVENT
BEGIN:VEVENT
UID:weekly-recurrence
DTSTART;VALUE=DATE:20260305
DTEND;VALUE=DATE:20260306
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Must not appear in output
END:VEVENT
END:VCALENDAR
"""
    calendar = parse_calendar(ics)
    start, end = date(2026, 3, 1), date(2027, 6, 1)
    busy = busy_dates_from_calendar(calendar, start, end)
    expected = [
        "2026-03-05",
        "2026-03-12",
        "2026-03-19",
        "2026-12-06",
        "2026-12-31",
        "2027-01-01",
        "2027-01-15",
        "2027-02-12",  # 2027-02-13 04:00Z is 2027-02-12 20:00 Pacific
        "2027-05-15",
        "2027-05-16",
    ]
    data = payload(busy, generated=datetime(2026, 11, 15, 12, 0, 0, tzinfo=ZoneInfo("UTC")))
    validate_payload(data)
    blob = json.dumps(data)
    leaked = ["Must not appear", "all-day-exclusive", "weekly-recurrence", "LOCATION", "DESCRIPTION"]
    if any(token.lower() in blob.lower() for token in leaked):
        print("SELF-TEST FAILED: event details leaked into JSON", file=sys.stderr)
        return 1
    if busy != expected:
        print("SELF-TEST FAILED: busy dates did not match.", file=sys.stderr)
        print(" got:     ", busy, file=sys.stderr)
        print(" expected:", expected, file=sys.stderr)
        return 1
    print(f"self-test passed: {len(busy)} dates, no event details in output")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=os.environ.get("OUTLOOK_ICS_URL", ""), help="Published ICS URL")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent.parent / "data" / "busy-dates.json"),
        help="Path to busy-dates JSON",
    )
    parser.add_argument("--self-test", action="store_true", help="Run built-in parser tests and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    if not args.url:
        print("Set OUTLOOK_ICS_URL or pass --url.", file=sys.stderr)
        return 2

    ics_bytes = fetch_ics(args.url)
    calendar = parse_calendar(ics_bytes)
    start, end = window(today_in_hall())
    busy = busy_dates_from_calendar(calendar, start, end)
    data = payload(busy)
    validate_payload(data)
    path = Path(args.output)
    changed = write_if_changed(path, data)
    # Log only counts — never event details (Actions logs are public).
    if changed:
        print(f"Wrote {len(busy)} busy dates to {path}")
    else:
        print(f"No change: {len(busy)} busy dates already in {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
