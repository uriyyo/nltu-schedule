from collections import defaultdict
from io import BytesIO
from typing import Any, TypeAlias, Annotated, Literal, Final, Iterator, Self, Container

import pandas as pd
from annotated_types import Interval
from fastapi import FastAPI, Query, status
from fastapi.responses import JSONResponse
from httpx import get, HTTPStatusError
from pydantic import AnyHttpUrl, BaseModel, AfterValidator, StringConstraints, Field, model_validator
from starlette.datastructures import URL

EVENT_START_TIMES: Final[list[str]] = [
    "08:30",
    "10:20",
    "12:10",
    "14:30",
    "16:20",
]
EVENT_END_TIMES: Final[list[str]] = [
    "10:05",
    "11:55",
    "13:45",
    "16:05",
    "17:35",
]
SUB_EVENT_KEYS: Final[list[str]] = [
    "nominator",
    "denominator",
    "simple",
]
SUB_EVENT_NORMALIZERS: Final[dict[str, str]] = {
    "лек.": "лекція",
    "лаб.": "лабораторна",
    "практ.": "практичні",
}

RAW_DAYS: Final[list[str]] = [
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "Пятниця",
]
DAYS: Final[list[str]] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
]
RAW_DAY_TO_DAY = dict(zip(RAW_DAYS, DAYS))

Days: TypeAlias = Literal[*DAYS]

StartTime: TypeAlias = Literal[*EVENT_START_TIMES]
EndTime: TypeAlias = Literal[*EVENT_END_TIMES]

SubEventType: TypeAlias = Literal[
    "лекція",
    "лабораторна",
    "практичні",
    "адаптаційний курс",
]

StripedStr: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True),
]


class SubEventSchema(BaseModel):
    type: SubEventType
    name: StripedStr | None = Field(None, examples=["Математичний аналіз", "Адаптаційний курс"])
    location: StripedStr | None = Field(None, examples=["а.4 к.А"])
    tutor: StripedStr | None = Field(None, examples=["Процах Н.П.", "Лизанчук Т.С."])
    groups: list[StripedStr] | None = Field(None, examples=[["КН-1", "КН-2"]])


class EventSchema(BaseModel):
    startTime: StartTime = Field(..., examples=EVENT_START_TIMES)
    endTime: EndTime = Field(..., examples=EVENT_END_TIMES)
    order: Annotated[int, Interval(ge=1, le=5)] = Field(..., examples=[1, 2, 3, 4, 5])
    nominator: SubEventSchema | None = None
    denominator: SubEventSchema | None = None
    simple: SubEventSchema | None = None

    @model_validator(mode="after")
    @classmethod
    def __validate_subevents__(cls, event: Self) -> Self:
        if event.simple:
            groups = []
            if event.nominator:
                groups.extend(event.nominator.groups or [])
            if event.denominator:
                groups.extend(g for g in event.denominator.groups or [] if g not in groups)

            event.nominator = None
            event.denominator = None

            # regroup and merge groups from nominator and denominator
            if groups:
                current = event.simple.groups or []
                event.simple.groups = current + [g for g in groups if g not in current]

        return event


StartTimeToEvent: TypeAlias = Annotated[
    dict[StartTime, EventSchema],
    AfterValidator(lambda d: {k: d[k] for k in sorted(d, key=EVENT_START_TIMES.index)}),
]
DayToEvents: TypeAlias = Annotated[
    dict[Days, StartTimeToEvent | None],
    AfterValidator(lambda d: {k: d[k] for k in sorted(d, key=DAYS.index)}),
]

RootSchedulesSchema: TypeAlias = dict[StripedStr, DayToEvents]


def fetch_schedule_csv_io(url: str) -> BytesIO:
    response = get(url, follow_redirects=True)
    response.raise_for_status()

    return BytesIO(response.content)


def get_schedule_df(url: str) -> pd.DataFrame:
    with fetch_schedule_csv_io(url) as csv_io:
        df = pd.read_csv(csv_io, skiprows=1)

    df = df.rename(columns={"Unnamed: 0": "day", "Unnamed: 1": "time"})
    df = df.drop(df.filter(regex="^Unnamed.*$").columns, axis=1)
    df = df.dropna(axis=0, how="all")
    df = df[:-1]

    df = df.ffill()
    df["day"] = df["day"].str.replace("\n", "").ffill()
    df["day"] = df["day"].apply(lambda d: d.title())
    df["time"] = df["time"].apply(lambda x: tuple(x.split("_")))
    df = df.replace("---", None)

    return df


def parse_subject(subject: str) -> dict[str, Any]:
    subject, type_ = subject.rsplit(maxsplit=1)

    return {"name": subject, "type": type_.strip('"').strip("_")}


class InvalidEventFormatError(ValueError):
    pass


def parse_event(event: str) -> dict[str, Any]:
    for old, new in SUB_EVENT_NORMALIZERS.items():
        event = event.replace(old, new)

    parts = [p.strip() for p in event.strip().split("\n")]

    match parts:
        # exceptional case for "адаптаційний курс"
        case [groups, _, type_] if type_ == "адаптаційний курс":
            return {
                "groups": groups.split(","),
                "name": "Адаптаційний курс",
                "type": "адаптаційний курс",
            }
        case [groups, subject, tutor, location]:
            return {
                "groups": groups.split(","),
                **parse_subject(subject),
                "tutor": tutor.strip(),
                "location": location.strip(),
            }
        case [subject, tutor, location]:
            return {
                **parse_subject(subject),
                "tutor": tutor.strip(),
                "location": location.strip(),
            }
        case _:
            raise InvalidEventFormatError(f"Unexpected event format: {event!r}")


def normalize_event(odd: str | None, even: str | None) -> dict[str, Any] | None:
    if not odd and not even:  # empty event
        return None
    if odd == even:
        return {"simple": parse_event(odd)}

    return {
        "nominator": odd and parse_event(odd),
        "denominator": even and parse_event(even),
    }


def prefill_missed_groups(event: dict[str, dict[str, Any]], group: str) -> dict[str, Any]:
    for subevent in event.values():
        if subevent and not subevent.get("groups"):
            subevent["groups"] = [group]

    return event


def get_group_schedule(df: pd.DataFrame, group: str) -> Any:
    df = df[["day", "time", group]]
    days: dict[str, dict[str, list[Any]]] = defaultdict(lambda: defaultdict(lambda: [None, None]))

    for _, day, (time, week), event in df.itertuples():
        days[day][time][int(week != "ч")] = event and event.strip()

    result = {}
    for day, times in days.items():
        day_events = {
            start: {
                "startTime": start,
                "endTime": EVENT_END_TIMES[EVENT_START_TIMES.index(start)],
                "order": EVENT_START_TIMES.index(start) + 1,
                **prefill_missed_groups(event, group),
            }
            for start, events in times.items()
            if (event := normalize_event(*events))
        }

        if day_events:
            result[RAW_DAY_TO_DAY[day]] = day_events

    return result


def remove_keys(d: dict[str, Any], keys: Container[str]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if k not in keys}


def flat_events_for_tutor(schedule: dict[str, Any]) -> Iterator[Any]:
    for days in schedule.values():
        for day, events in days.items():
            for start, event in events.items():
                for key in SUB_EVENT_KEYS:
                    if (subevent := event.get(key)) and (tutor := subevent.get("tutor")):
                        yield tutor, day, start, key, event, subevent


def regroup_schedule_for_tutors(schedule: dict[str, Any]) -> dict[str, Any]:
    tutors_schedules = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {})))

    for tutor, day, start, key, event, subevent in flat_events_for_tutor(schedule):
        tutors_schedules[tutor][day][start] |= remove_keys(event, SUB_EVENT_KEYS)
        existing = tutors_schedules[tutor][day][start].get(key)
        assert not existing or existing["name"] == subevent["name"], "Different subjects for the same tutor"
        tutors_schedules[tutor][day][start][key] = subevent

    return {tutor: tutors_schedules[tutor] for tutor in sorted(tutors_schedules)}


def normalize_sheet_url(url: AnyHttpUrl) -> str:
    if url.path.strip("/").endswith("/edit"):
        export_url = URL(str(url))
        export_url = export_url.include_query_params(format="csv").replace(
            path=export_url.path.removesuffix("/edit") + "/export",
        )

        url = AnyHttpUrl(str(export_url))

    assert url.path.strip("/").endswith("/export"), "URL should end with /export"
    assert dict(url.query_params()).get("format") == "csv", "URL should have format=csv query param"

    return url


SheetUrl: TypeAlias = Annotated[
    AnyHttpUrl,
    AfterValidator(normalize_sheet_url),
]


app = FastAPI(
    title="NLTU Schedule Parsing API",
    description="API for parsing NLTU schedule from Google Sheets",
    version="0.2.0",
)

app.add_exception_handler(
    InvalidEventFormatError,
    lambda request, exc: JSONResponse(
        content={"detail": "Invalid event format, please contact the developer"},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    ),
)
app.add_exception_handler(
    HTTPStatusError,
    lambda request, exc: JSONResponse(
        content={"detail": "Error while fetching schedule sheet"},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    ),
)


@app.get(
    "/schedules",
    response_model=RootSchedulesSchema,
)
def get_schedule(
    *,
    sheet_url: SheetUrl = Query(
        ...,
        description="URL of the schedule sheet",
        annotation=SheetUrl,
    ),
    for_: Literal["students", "tutors"] = Query(
        "students",
        alias="for",
        description="Who is the schedule for",
    ),
) -> Any:
    df = get_schedule_df(str(sheet_url))
    groups = [*df.columns[2:]]

    schedules = {group: get_group_schedule(df, group) for group in groups}

    if for_ == "tutors":
        schedules = regroup_schedule_for_tutors(schedules)

    return schedules


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app)
