import re
from collections import defaultdict
from itertools import chain
from typing import Any, TypeAlias, Sequence, Annotated, Literal, Final
import pandas as pd
from annotated_types import Interval
from httpx import get
from io import BytesIO
from fastapi import FastAPI, Query, status
from fastapi.responses import JSONResponse
from pydantic import AnyHttpUrl, BaseModel, AfterValidator, StringConstraints, BeforeValidator, Field
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
SUB_EVENTS_KEYS: Final[list[str]] = [
    "first",
    "second",
    "third",
]
SUB_EVENT_NORMALIZERS: Final[dict[str, str]] = {
    "лек.": "лекція",
    "лаб.": "лабораторна",
    "практ.": "практичні",
}

Days: TypeAlias = Annotated[
    Literal[
        "Понеділок",
        "Вівторок",
        "Середа",
        "Четвер",
        "П'ятниця",
    ],
    BeforeValidator(lambda v: "П'ятниця" if v == "Пятниця" else v),
]
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

    verticalFull: bool = False
    horizontalFull: bool = False


class SubEventsSchema(BaseModel):
    first: SubEventSchema | None = None
    second: SubEventSchema | None = None
    third: SubEventSchema | None = None


class EventSchema(BaseModel):
    startTime: Literal[*EVENT_START_TIMES] = Field(..., examples=EVENT_START_TIMES)
    endTime: Literal[*EVENT_END_TIMES] = Field(..., examples=EVENT_END_TIMES)
    order: Annotated[int, Interval(ge=1, le=5)] = Field(..., examples=[1, 2, 3, 4, 5])
    nominator: SubEventsSchema | None = None
    denominator: SubEventsSchema | None = None


class DayEventSchema(BaseModel):
    day: Days
    events: list[EventSchema]


GroupScheduleSchema: TypeAlias = list[DayEventSchema]


class GroupSchema(BaseModel):
    name: StripedStr = Field(..., examples=["КН-1", "КН-2"])
    subGroups: list[StripedStr] = Field(..., examples=[["КН-1-1", "КН-1-2"], ["КН-2-1", "КН-2-2"]])


class RootSchedulesSchema(BaseModel):
    groups: list[GroupSchema]
    schedules: dict[StripedStr, GroupScheduleSchema]


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


def get_groups(df: pd.DataFrame) -> dict[str, list[str]]:
    groups = defaultdict(list)
    for subgroup in df.columns[2:]:
        group = re.sub(r"(\/|-)\d+.?$", "", subgroup)
        groups[group].append(subgroup)

    return groups


def all_same(items: Sequence[Any]) -> bool:
    return all(it == items[0] for it in items)


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


def normalize_event(odd: list[str], even: list[str]) -> dict[str, Any] | None:
    if all(it is None for it in chain(odd, even)):  # empty event
        return None

    def _parse_to_sub_events(events: list[str | None], *, type_: Literal["h", "v"], **rest: Any) -> dict[str, Any]:
        if type_ == "h" and all_same(events):
            rest["horizontalFull"] = True
            events = [events[0]]
        elif type_ == "v":
            rest["verticalFull"] = True

        return {key: rest | parse_event(val) for val, key in zip(events, SUB_EVENTS_KEYS) if val}

    if odd == even:
        if all_same(odd):
            return {
                "nominator": {
                    "first": {
                        **parse_event(odd[0]),
                        "verticalFull": True,
                        "horizontalFull": True,
                    }
                }
            }

        return {
            "nominator": _parse_to_sub_events(odd, type_="v"),
        }

    return {
        "nominator": _parse_to_sub_events(odd, type_="h"),
        "denominator": _parse_to_sub_events(even, type_="h"),
    }


def get_group_schedule(df: pd.DataFrame, subgroups: list[str]) -> Any:
    df = df[["day", "time", *subgroups]]
    days: dict[str, dict[str, Any]] = defaultdict(lambda: defaultdict(lambda: ([], [])))

    for _, day, (time, week), *rest in df.itertuples():
        for event in rest:
            days[day][time][int(week != "ч")].append(event and event.strip())

    result = []
    for day, times in days.items():
        day_events = [
            {
                "startTime": start,
                "endTime": EVENT_END_TIMES[EVENT_START_TIMES.index(start)],
                "order": EVENT_START_TIMES.index(start) + 1,
                **event,
            }
            for start, events in times.items()
            if (event := normalize_event(*events))
        ]

        if day_events:
            result.append({"day": day, "events": day_events})

    return result


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
    version="0.1.0",
)

app.add_exception_handler(
    InvalidEventFormatError,
    lambda request, exc: JSONResponse(
        content={"detail": "Invalid event format, please contact the developer"},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    ),
)


@app.get("/schedules")
def get_schedule(
    *,
    sheet_url: SheetUrl = Query(
        ...,
        description="URL of the schedule sheet",
        annotation=SheetUrl,
    ),
) -> RootSchedulesSchema:
    df = get_schedule_df(str(sheet_url))
    groups = get_groups(df)

    return RootSchedulesSchema.model_validate(
        {
            "groups": [{"name": group, "subGroups": subgroups} for group, subgroups in groups.items()],
            "schedules": {group: get_group_schedule(df, subgroups) for group, subgroups in groups.items()},
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app)
