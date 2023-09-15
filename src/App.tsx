import React, { useCallback, useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Card,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Stack,
  useTheme,
} from "@mui/material";
import data from "./data.json";
import {
  AnyDay,
  DayOfWeek,
  GroupSchedule,
  GroupsSchedules,
  HorizontalDayEvent,
  RelativeDay,
  ScheduleEvent,
  SingleDayEvent,
  VerticalDayEvent,
} from "./types";
import { useSearchParams } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import useMediaQuery from "@mui/material/useMediaQuery";
import CopyToClipboardButton from "./components/CopyToClipboardButton";
import { grey } from "@mui/material/colors";

const xsSizeForArray = (arr: any[]) => 12 / arr.length;

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
  const isNominator = getWeekNumber(today) % 2 === 0;

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
          <Grid key={idx} xs={xsSizeForArray(events)}>
            {it ? (
              <EventContentInfo
                halfHeight={events.length > 1}
                subEvent={true}
                nominator={nominator}
              >
                {it}
              </EventContentInfo>
            ) : (
              <EventBox empty={true} />
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      {events?.map((it: any, idx: number) => (
        <Grid key={idx} item xs={12}>
          {mapHorizontalEvents(it, idx % 2 === 0)}
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

const DayInfo = ({ time, order, event }: ScheduleEvent) => (
  <div>
    <h3>
      {order} Пара ({time})
    </h3>
    <Stack direction={"row"}>
      <Stack width={"5%"}>
        {["Ч", "З"].map((it) => (
          <EventBox
            halfHeight={true}
            empty={true}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography textAlign={"center"} variant={"h5"}>
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

const useLinkForDay = () => {
  const [searchParams] = useSearchParams();

  return useCallback(
    (day: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("day", day);

      const [baseLink] = window.location.href.split("?");
      return `${baseLink}?${params.toString()}`;
    },
    [searchParams],
  );
};

const Day = ({ day, events }: GroupSchedule) => {
  const getLinkForDay = useLinkForDay();

  return (
    <div>
      <Stack direction={"row"} sx={{ justifyContent: "space-between" }}>
        <h2>{day}</h2>
        <CopyToClipboardButton link={getLinkForDay(day)} />
      </Stack>

      {events.map((it: any) => (
        <DayInfo key={it.time} {...it} />
      ))}
    </div>
  );
};

const GoToDayButton = ({
  day,
  goToDay,
  schedule,
}: {
  day: AnyDay;
  goToDay: (day: AnyDay) => any;
  schedule: GroupSchedule[];
}) => {
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

      setSearchParams(searchParams);
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

const DaysButtonGroup = ({
  schedule,
  goToDay,
}: {
  schedule: GroupSchedule[];
  goToDay: (day: AnyDay) => any;
}) => {
  const commonButtonArgs = { goToDay, schedule };
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

const Schedule = ({
  schedule,
  goToDay,
}: {
  schedule: GroupSchedule[];
  goToDay: (day: AnyDay) => any;
}) => {
  return (
    <div>
      <h1>Розклад</h1>

      <Divider />
      <br />

      <ScheduleWeekTypeInfo />

      <Divider />
      <br />

      <DaysButtonGroup goToDay={goToDay} schedule={schedule} />

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
  const allSchedules: GroupsSchedules = data as GroupsSchedules;

  return { schedule, setSchedule, allSchedules };
};

const useGroup = (
  allSchedules: GroupsSchedules,
  setSchedule: (arg: GroupSchedule[] | null) => any,
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [group, setGroup] = useState(searchParams.get("group"));

  useEffect(() => {
    if (!group) return;

    searchParams.set("group", group);
    setSearchParams(searchParams);
    setSchedule(allSchedules[group]?.schedule);
  }, [group, searchParams, setSearchParams, allSchedules, setSchedule]);

  return { group, setGroup };
};

function App() {
  const { schedule, setSchedule, allSchedules } = useSchedule();
  const { group, setGroup } = useGroup(allSchedules, setSchedule);
  const { goToDay } = useGoToDay();

  return (
    <div className="App">
      <ScrollToTop />

      <Container maxWidth="md">
        <h1>НЛТУ Розклад занять для спеціальностей КН, ІСТ, ІПЗ</h1>

        <Autocomplete
          value={group}
          disablePortal
          id="group"
          options={Object.keys(allSchedules)}
          onChange={(event, value, reason) => {
            if (reason === "selectOption") {
              setGroup(value);
              goToDay(null);
            }
          }}
          renderInput={(params) => <TextField {...params} label="Група" />}
        />

        <br />

        {schedule && (
          <Card variant="outlined" sx={{ padding: "10px" }}>
            <Schedule goToDay={goToDay} schedule={schedule} />
          </Card>
        )}
      </Container>
    </div>
  );
}

export default App;
