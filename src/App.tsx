import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Card,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import students from "./students.json";
import teachers from "./teachers.json";
import {
  AnyDay,
  DayOfWeek,
  GroupSchedule,
  GroupsSchedules,
  HorizontalDayEvent,
  RelativeDay,
  ScheduleEvent,
  ScheduleType,
  SingleDayEvent,
  VerticalDayEvent,
} from "./types";
import { useSearchParams } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import useMediaQuery from "@mui/material/useMediaQuery";
import CopyToClipboardButton from "./components/CopyToClipboardButton";
import ReactGA from "react-ga4";
import { grey } from "@mui/material/colors";

const xsSizeForArray = (arr: any[] | undefined) => 12 / (arr?.length ?? 1);

const getWeekNumber = (d: Date): number => {
  d = new Date(+d);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);

  // @ts-ignore
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const isCurrentDayWeekend = () => [0, 6].includes(new Date().getDay());

const isCurrentWeekNominator = () => {
  const today = new Date();
  const isNominator = getWeekNumber(today) % 2 === 1;

  return isCurrentDayWeekend() ? !isNominator : isNominator;
};

const getActualDay = (day: AnyDay): DayOfWeek | null => {
  const days = Object.values(DayOfWeek);

  switch (day) {
    case RelativeDay.Today:
      return days[new Date().getDay() - 1] as DayOfWeek;
    case RelativeDay.Tomorrow:
      return days[new Date().getDay()] as DayOfWeek;
    default:
      return days.includes(day as DayOfWeek) ? day : null;
  }
};

const isDayAvailable = (day: AnyDay, schedule: GroupSchedule[]) => {
  const actualDay = getActualDay(day);
  return actualDay && schedule.some((it) => it.day === actualDay);
};

const EventBox = ({
  children,
  nominator = true,
  subEvent = false,
  halfHeight = false,
  empty = false,
  sx = {},
  ...rest
}: any) => {
  const { palette } = useTheme();

  const colorType =
    !subEvent || nominator === isCurrentWeekNominator()
      ? "primary"
      : "secondary";

  const color: string = empty ? "white" : palette[colorType].main;

  if (!empty) {
    sx.borderColor = grey[500];
    sx.border = 1;
    sx["&:hover"] = { backgroundColor: palette[colorType].contrastText };
  }

  return (
    <Box
      {...rest}
      sx={{
        backgroundColor: color,
        height: halfHeight ? "100px" : "200px",
        margin: 1,
        borderRadius: 5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

const EventContentInfo = ({ children, sx, ...rest }: any) => (
  <EventBox
    margin={"10px"}
    display={"flex"}
    flexDirection={"column"}
    justifyContent={"center"}
    {...rest}
  >
    <Typography textAlign={"center"} mt={2}>
      {children}
    </Typography>
  </EventBox>
);

const VerticalEventInfo = ({ events }: Partial<VerticalDayEvent>) => (
  <>
    {events?.map(({ type, event }: any, idx: number) => (
      <Grid item key={idx} xs={xsSizeForArray(events)}>
        {type === "empty" ? (
          <EventBox empty={true} />
        ) : type === "single" ? (
          <EventContentInfo>{event}</EventContentInfo>
        ) : (
          <div>Unknown vertical event</div>
        )}
      </Grid>
    ))}
  </>
);

const HorizontalEventInfo = ({ events }: Partial<HorizontalDayEvent>) => {
  const mapHorizontalEvents = (
    { type, event, events }: any,
    nominator: boolean,
    isHalfEvent: boolean,
  ) => {
    if (type === "empty")
      return <EventBox halfHeight={true} nominator={nominator} empty={true} />;
    if (type === "single")
      return (
        <EventContentInfo
          subEvent={true}
          halfHeight={true}
          nominator={nominator}
        >
          {event}
        </EventContentInfo>
      );

    return (
      <Grid container>
        {events.map((it: any, idx: number) => (
          <Grid item key={idx} xs={xsSizeForArray(events)}>
            {it ? (
              <EventContentInfo
                subEvent={true}
                halfHeight={isHalfEvent}
                nominator={nominator}
              >
                {it}
              </EventContentInfo>
            ) : (
              <EventBox halfHeight={isHalfEvent} empty={true} />
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      {events?.map((it: any, idx: number) => (
        <Grid item key={idx} xs={12}>
          {mapHorizontalEvents(it, idx % 2 === 0, events?.length > 1)}
        </Grid>
      ))}
    </>
  );
};

const SingleEventInfo = ({ event }: Partial<SingleDayEvent>) => (
  <Grid item xs={12}>
    <EventContentInfo>{event}</EventContentInfo>
  </Grid>
);

const DayEventInfo = ({ event }: Partial<ScheduleEvent>) => {
  if (event?.type === "single") return <SingleEventInfo {...event} />;
  if (event?.type === "vertical") return <VerticalEventInfo {...event} />;
  if (event?.type === "horizontal") return <HorizontalEventInfo {...event} />;

  return <div>Unknown event type</div>;
};

const DayInfo = ({ time, order, event }: ScheduleEvent) => {
  return (
    <div>
      <Typography textAlign={"start"} variant={"h6"}>
        {order} Пара ({time})
      </Typography>

      {/* TODO: not sure if we need this
      <Stack direction={"row"}>
        <Stack width={"5%"}></Stack>
        <Stack width={"95%"} direction={"row"}>
          {subGroups?.map((it: any, idx: number) => (
            <Typography
              key={idx}
              width={"50%"}
              textAlign={"center"}
              variant={"h6"}
            >
              {it}
            </Typography>
          ))}
        </Stack>
      </Stack>
      */}

      <Stack direction={"row"}>
        <Stack width={"5%"}>
          {["Ч", "З"].map((it) => (
            <EventBox
              key={it}
              halfHeight={true}
              empty={true}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography textAlign={"center"} variant={"h6"}>
                {it}
              </Typography>
            </EventBox>
          ))}
        </Stack>
        <Grid container width={"95%"}>
          <DayEventInfo event={event}></DayEventInfo>
        </Grid>
      </Stack>
    </div>
  );
};

const useLinkForDay = () => {
  const [searchParams] = useSearchParams();

  return useCallback(
    (day: string) => {
      const params = new URLSearchParams(searchParams);
      prepareSearchParams(params);
      params.set("day", day);

      const [baseLink] = window.location.href.split("?");
      return `${baseLink}?${params.toString()}`;
    },
    [searchParams],
  );
};

const Day = ({
  day,
  events,
  subGroups,
}: GroupSchedule & { subGroups?: string[] | null }) => {
  const getLinkForDay = useLinkForDay();

  return (
    <div>
      <Stack direction={"row"} sx={{ justifyContent: "space-between" }}>
        <h2>{day}</h2>
        <CopyToClipboardButton link={getLinkForDay(day)} />
      </Stack>

      {events.map((it: any, idx: number) => (
        <DayInfo key={idx} subGroups={subGroups} {...it} />
      ))}
    </div>
  );
};

const GoToDayButton = ({
  day,
  schedule,
}: {
  day: AnyDay;
  schedule: GroupSchedule[];
}) => {
  const { goToDay } = useContext(AppContext);

  return (
    <Button
      color={"inherit"}
      onClick={() => goToDay(day)}
      disabled={!isDayAvailable(day, schedule)}
    >
      {day}
    </Button>
  );
};

const prepareSearchParams = (params: URLSearchParams): URLSearchParams => {
  const for_ = params.get("for");

  if (for_) {
    // need it to have for as last param
    params.delete("for");
    params.set("for", for_);
  }

  return params;
};

const useGoToDay = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [day, setDay] = useState<AnyDay | null>(
    searchParams.get("day") as AnyDay,
  );

  const scrollToDay = useCallback((day: AnyDay) => {
    const actualDay = getActualDay(day);

    document
      .querySelector(`[data-week-day="${actualDay}"]`)
      ?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const goToDay = useCallback(
    (day: AnyDay | null) => {
      if (!day) {
        searchParams.delete("day");
      } else {
        searchParams.set("day", day);
      }

      setSearchParams(prepareSearchParams(searchParams));
      setDay(day);

      if (day) scrollToDay(day);
    },
    [scrollToDay, searchParams, setSearchParams, setDay],
  );

  useEffect(() => {
    if (!day) return;

    scrollToDay(day);
  }, [day, scrollToDay]);

  // TODO: try to find a better way for initial scroll to selected day
  const [inited, setInited] = useState(false);

  useEffect(() => {
    if (!inited) setInited(true);
  }, [inited]);

  useEffect(() => {
    if (!inited) return;
    goToDay(day);
  }, [inited, day, goToDay]);

  return { day, goToDay };
};

const SubGroupsButtonGroup = () => {
  const { group, subGroups, subGroup, setSubGroup } = useContext(AppContext);

  return (
    <ButtonGroup variant="outlined" fullWidth={true}>
      <Button
        color={"inherit"}
        onClick={() => setSubGroup(null)}
        disabled={subGroup === null}
      >
        {group}
      </Button>

      {subGroups?.map((it: any, idx: number) => (
        <Button
          key={idx}
          color={"inherit"}
          onClick={() => setSubGroup(it)}
          disabled={subGroup === it}
        >
          {it}
        </Button>
      ))}
    </ButtonGroup>
  );
};

const DaysButtonGroup = ({ schedule }: { schedule: GroupSchedule[] }) => {
  const commonButtonArgs = { schedule };
  const smallScreen = useMediaQuery("(max-width:720px)");

  const buttonForDay = (day: AnyDay) => (
    <GoToDayButton key={day} {...commonButtonArgs} day={day} />
  );

  return (
    <div>
      <ButtonGroup
        orientation={smallScreen ? "vertical" : "horizontal"}
        variant="outlined"
        fullWidth={true}
      >
        {Object.values(RelativeDay).map(buttonForDay)}
        {Object.values(DayOfWeek).map(buttonForDay)}
      </ButtonGroup>
    </div>
  );
};

const ScheduleWeekTypeInfo = () => (
  <Typography variant="h6" component="div" gutterBottom>
    {isCurrentDayWeekend() ? <span>Наступний</span> : <span>Поточний</span>}

    <span> тиждень за </span>

    {isCurrentWeekNominator() ? (
      <span>чисельником</span>
    ) : (
      <span>знаменником</span>
    )}
  </Typography>
);

const Schedule = ({ schedule }: { schedule: GroupSchedule[] }) => {
  const { group, subGroup, subGroups } = useContext(AppContext);

  return (
    <div>
      <h1>Розклад для {subGroup ?? group}</h1>

      <Divider />
      <br />

      <ScheduleWeekTypeInfo />

      <Divider />
      <br />

      {subGroups && (
        <>
          <SubGroupsButtonGroup />
          <Divider />
          <br />
        </>
      )}

      <DaysButtonGroup schedule={schedule} />

      <br />
      <Divider />

      <>
        {schedule.map(({ day, events }: any, idx: number) => (
          <div data-week-day={day} key={idx}>
            <Divider />
            <Day key={day} day={day} events={events} />
            <br />
          </div>
        ))}
      </>
    </div>
  );
};

const useSchedule = () => {
  const [schedule, setSchedule] = useState<GroupSchedule[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    searchParams.get("for") === "teachers"
      ? ScheduleType.Teachers
      : ScheduleType.Students,
  );

  // @ts-ignore
  const allSchedules: GroupsSchedules =
    scheduleType === ScheduleType.Students ? students : teachers;

  const setScheduleTypeCallback = useCallback(
    (type: ScheduleType) => {
      if (type === scheduleType) return;

      setScheduleType(type);

      const params = new URLSearchParams();
      params.set("for", type);
      setSearchParams(prepareSearchParams(params));
    },
    [setSearchParams, scheduleType],
  );

  return {
    schedule,
    setSchedule,
    allSchedules,
    scheduleType,
    setScheduleType: setScheduleTypeCallback,
  };
};

const ChooseScheduleButtonGroup = ({
  setGroup,
  scheduleType,
  setScheduleType,
}: any) => {
  const setType = (type: ScheduleType) => {
    setGroup(null);
    setScheduleType(type);
  };

  return (
    <ButtonGroup variant="outlined" fullWidth={true}>
      <Button
        color={"inherit"}
        onClick={() => setType(ScheduleType.Students)}
        disabled={scheduleType === ScheduleType.Students}
      >
        Для Cтудентів
      </Button>
      <Button
        color={"inherit"}
        onClick={() => setType(ScheduleType.Teachers)}
        disabled={scheduleType === ScheduleType.Teachers}
      >
        Для Викладачів
      </Button>
    </ButtonGroup>
  );
};

const preFilterScheduleBySubGroup = (
  schedule: GroupSchedule[],
  subGroupIdx: number,
): GroupSchedule[] => {
  schedule = structuredClone(schedule);

  const mapDayEvent = (dayEvent: ScheduleEvent) => {
    if (dayEvent.event.type === "vertical") {
      let event = dayEvent.event.events[subGroupIdx];
      if (event.type === "empty") return null;

      dayEvent.event.events = [event];
    } else if (dayEvent.event.type === "horizontal") {
      dayEvent.event.events = dayEvent.event.events.map((it) => {
        if (it.type === "multiple") {
          it.events = [it.events[subGroupIdx]];

          if (it.events.every((x) => !x)) return { type: "empty" };
        }
        return it;
      });

      if (dayEvent.event.events.every((it) => it.type === "empty")) return null;
    }

    return dayEvent;
  };

  for (const day of schedule) {
    // @ts-ignore
    day.events = day.events.map(mapDayEvent).filter((it) => it);
  }

  return schedule.filter((it) => it.events.length > 0);
};

const useGroup = (
  allSchedules: GroupsSchedules,
  setSchedule: (arg: GroupSchedule[] | null) => any,
  goToDay: (arg: AnyDay | null) => any,
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [group, setGroup] = useState(searchParams.get("group"));
  const [subGroups, setSubGroups] = useState<string[] | null>(null);
  const [subGroup, setSubGroup] = useState<string | null>(
    searchParams.get("subGroup"),
  );

  const updateTitle = (subTitle: string | null) => {
    const [mainTitle] = document.title.split("|");
    document.title = subTitle
      ? `${mainTitle.trim()} | ${subTitle}`
      : mainTitle.trim();
  };

  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: window.location.pathname + window.location.search,
    });
  }, [searchParams]);

  useEffect(() => {
    updateTitle(subGroup ?? group);

    if (!group) return;

    let schedule = allSchedules[group]?.schedule;

    if (schedule && subGroup) {
      const subGroupIdx = allSchedules[group]?.subgroups?.indexOf(subGroup);
      if (Number.isInteger(subGroupIdx) && subGroupIdx !== -1) {
        schedule = preFilterScheduleBySubGroup(schedule, subGroupIdx);
      }
    }

    searchParams.set("group", group);
    setSchedule(schedule);
    setSubGroups(allSchedules[group]?.subgroups || null);

    if (subGroup) searchParams.set("subGroup", subGroup);
    else searchParams.delete("subGroup");

    setSearchParams(prepareSearchParams(searchParams));
  }, [
    group,
    searchParams,
    setSearchParams,
    allSchedules,
    setSchedule,
    subGroup,
  ]);

  const setSubGroupResetDay = useCallback(
    (subGroup: string | null) => {
      setSubGroup(subGroup);
      goToDay(null);
    },
    [setSubGroup, goToDay],
  );

  const setGroupResetSubGroup = useCallback(
    (group: string | null) => {
      setGroup(group);
      setSchedule(null);
      setSubGroups(null);
      setSubGroupResetDay(null);
    },
    [setGroup, setSubGroups, setSchedule, setSubGroupResetDay],
  );

  return {
    group,
    setGroup: setGroupResetSubGroup,
    subGroups,
    subGroup,
    setSubGroup: setSubGroupResetDay,
  };
};

const AppContext = React.createContext<any | null>(null);

function App() {
  const { schedule, setSchedule, allSchedules, scheduleType, setScheduleType } =
    useSchedule();
  const { goToDay } = useGoToDay();
  const { group, setGroup, subGroups, subGroup, setSubGroup } = useGroup(
    allSchedules,
    setSchedule,
    goToDay,
  );

  return (
    <div className="App">
      <ScrollToTop />

      <Container maxWidth="md">
        <h1>НЛТУ Розклад занять для спеціальностей КН, ІСТ, ІПЗ</h1>

        <ChooseScheduleButtonGroup
          setGroup={setGroup}
          scheduleType={scheduleType}
          setScheduleType={setScheduleType}
        />

        <Divider />
        <br />

        <Autocomplete
          value={group}
          disablePortal
          id="group"
          options={Object.keys(allSchedules)}
          onChange={(event, value, reason) => {
            if (reason === "selectOption") {
              setGroup(value);
              goToDay(null);

              ReactGA.event({
                category: "Schedule",
                action: `Select ${value}`,
              });
            } else if (reason === "clear") {
              setGroup(null);
              goToDay(null);

              ReactGA.event({
                category: "Schedule",
                action: "Clear group",
              });
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={
                scheduleType === ScheduleType.Students ? "Група" : "Викладач"
              }
            />
          )}
        />

        <br />

        {schedule && (
          <Card variant="outlined" sx={{ padding: "10px" }}>
            <AppContext.Provider
              value={{ group, subGroups, subGroup, setSubGroup, goToDay }}
            >
              <Schedule schedule={schedule} />
            </AppContext.Provider>
          </Card>
        )}
      </Container>
    </div>
  );
}

export default App;
