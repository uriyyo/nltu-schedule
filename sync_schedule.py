import os
import re
from collections import defaultdict
from itertools import chain
from typing import Any, Literal, TypeAlias, Sequence
from pathlib import Path
import pandas as pd
from httpx import get
from io import BytesIO
import json

ROOT = Path(__file__).parent

URL = os.getenv("SCHEDULE_URL")

EMPTY_CELLS = ["---", "-x-"]

EVENT_START_TIMES = [
    "08:30",
    "10:20",
    "12:10",
    "14:30",
    "16:20",
]
EVENT_END_TIMES = [
    "10:05",
    "11:55",
    "13:45",
    "16:05",
    "17:35",
]
DAYS = [
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "Пятниця",
]

CellType: TypeAlias = Literal[
    "single",
    "vertical",
    "horizontal",
    "multiple",
]


def fetch_schedule_csv_io() -> BytesIO:
    response = get(URL, follow_redirects=True)
    response.raise_for_status()

    return BytesIO(response.content)


def get_schedule_df() -> pd.DataFrame:
    with fetch_schedule_csv_io() as csv_io:
        df = pd.read_csv(csv_io, skiprows=1)

    df = df.rename(columns={"Unnamed: 0": "day", "Unnamed: 1": "time"})
    df = df.drop(df.filter(regex="^Unnamed.*$").columns, axis=1)
    df = df.dropna(axis=0, how="all")
    df = df[:-1]

    df = df.ffill()
    df["day"] = df["day"].str.replace("\n", "").ffill()
    df["day"] = df["day"].apply(lambda d: d.title())
    df["time"] = df["time"].apply(lambda x: tuple(x.split("_")))

    for cell in EMPTY_CELLS:
        df = df.replace(cell, None)

    return df


def get_teachers_schedule_df() -> pd.DataFrame:
    df = pd.read_csv("teachers_schedule.csv", skiprows=1, header=None).T  # Read csv, and transpose
    df.columns = df.iloc[0]
    df.drop(0, inplace=True)
    df.columns = ["day", "time", *df.columns[2:]]
    df = df.dropna(axis=0, how="all")
    df = df.dropna(axis=1, how="all")

    df = df.ffill()
    df["day"] = df["day"].str.replace("\n", "").ffill()
    df["day"] = df["day"].apply(lambda d: d.title())
    df["time"] = df["time"].apply(lambda x: tuple(x.split("_")))

    for cell in EMPTY_CELLS:
        df = df.replace(cell, None)

    return df


def get_group_name(subgroup: str) -> str:
    return re.sub(r"(\/|-)\d+.?$", "", subgroup)


def get_groups(df: pd.DataFrame) -> dict[str, list[str]]:
    groups = defaultdict(list)
    for subgroup in df.columns[2:]:
        group = re.sub(r"(\/|-)\d+.?$", "", subgroup)
        groups[group].append(subgroup)

    return groups


def all_same(items: Sequence[Any]) -> bool:
    return all(it == items[0] for it in items)


def normalize_subevents(events: list[str]) -> dict[str, Any] | None:
    if all_same(events):
        if not events[0]:
            return {"type": "empty"}

        return {"type": "single", "event": events[0]}

    return {"type": "multiple", "events": events}


def normalize_event(odd: list[str], even: list[str]) -> dict[str, Any] | None:
    if all(it is None for it in chain(odd, even)):  # empty event
        return None

    if odd == even:
        if all_same(odd):
            return {"type": "single", "event": odd[0]}

        return {
            "type": "vertical",
            "events": [{"type": "single", "event": val} if val else {"type": "empty"} for val in odd],
        }

    return {
        "type": "horizontal",
        "events": [
            normalize_subevents(odd),
            normalize_subevents(even),
        ],
    }


def get_grouped_schedule(df: pd.DataFrame, sub_entities: list[str]) -> Any:
    df = df[["day", "time", *sub_entities]]
    days: dict[str, dict[str, Any]] = defaultdict(lambda: defaultdict(lambda: ([], [])))

    for _, day, (time, week), *rest in df.itertuples():
        for event in rest:
            days[day][time][int(week != "ч")].append(event and event.strip())

    result = []
    for day, times in days.items():
        day_events = [
            {
                "time": f"{time} - {EVENT_END_TIMES[EVENT_START_TIMES.index(time)]}",
                "order": EVENT_START_TIMES.index(time) + 1,
                "event": event,
            }
            for time, events in times.items()
            if (event := normalize_event(*events))
        ]

        if day_events:
            result.append({"day": day, "events": day_events})

    return result


def get_teachers_schedule():
    df = get_teachers_schedule_df()
    teachers = [*df.columns[2:]]

    schedules = {
        teacher: {
            "teacher": teacher,
            "schedule": get_grouped_schedule(df, [teacher]),
        }
        for teacher in teachers
    }

    with (ROOT / "src" / "teachers.json").open("w") as f:
        json.dump(schedules, f, ensure_ascii=False, indent=4)


def get_students_schedule():
    df = get_schedule_df()
    groups = get_groups(df)

    schedules = {
        group: {
            "group": group,
            "subgroups": subgroups,
            "schedule": get_grouped_schedule(df, subgroups),
        }
        for group, subgroups in groups.items()
    }

    with (ROOT / "src" / "students.json").open("w") as f:
        json.dump(schedules, f, ensure_ascii=False, indent=4)


def main() -> None:
    get_students_schedule()
    # get_teachers_schedule() # TODO: Use this when teachers schedule is ready to be used via shared URL


if __name__ == "__main__":
    main()
