import React, { useEffect, useState } from "react";
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

const xsSizeForArray = (arr: any[]) => 12 / arr.length;

const getActualDay = (day: AnyDay): DayOfWeek | null => {
  switch (day) {
    case RelativeDay.Today:
      return Object.values(DayOfWeek)[new Date().getDay()] as DayOfWeek;
    case RelativeDay.Tomorrow:
      return Object.values(DayOfWeek)[new Date().getDay() + 1] as DayOfWeek;
    default:
      return Object.values(DayOfWeek).includes(day as DayOfWeek) ? day : null;
  }
};

const isDayAvailable = (day: AnyDay, schedule: GroupSchedule[]) => {
  let actualDay = getActualDay(day);
  return actualDay && schedule.some((it) => it.day === actualDay);
};

const EventBox = ({
  children,
  nominator = true,
  halfHeight = false,
  empty = false,
  sx = {},
  ...rest
}: any) => {
  const color: string = empty ? "white" : nominator ? "#4db6ac" : "#b2dfdb";

  if (!empty) {
    sx.borderColor = "#bdbdbd";
    sx.border = "1 px";
    sx["&:hover"] = { backgroundColor: nominator ? "#26a69a" : "#80cbc4" };
  }

  return (
    <Box
      {...rest}
      sx={{
        backgroundColor: color,
        height: halfHeight ? "100px" : "200px",
        margin: "10px",
        borderRadius: "10px",
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
        <EventContentInfo halfHeight={true} nominator={nominator}>
          {event}
        </EventContentInfo>
      );

    return (
      <Grid container>
        {events.map((it: any, idx: number) => (
          <Grid key={idx} xs={xsSizeForArray(events)}>
            {it ? (
              <EventContentInfo nominator={nominator}>{it}</EventContentInfo>
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
      {order} Пара (Початок {time})
    </h3>
    <Grid container>
      <DayEventInfo event={event}></DayEventInfo>
    </Grid>
  </div>
);

const Day = ({ day, events }: GroupSchedule) => (
  <div>
    <h2>{day}</h2>

    {events.map((it: any) => (
      <DayInfo key={it.time} {...it} />
    ))}
  </div>
);

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

  const goToDay = (day: AnyDay | null) => {
    if (!day) {
      searchParams.delete("day");
    } else {
      searchParams.set("day", day);
    }

    setSearchParams(searchParams);
    setDay(day);
  };

  useEffect(() => {
    if (!day) return;

    const actualDay = getActualDay(day);
    document
      .querySelector(`[data-week-day="${actualDay}"]`)
      ?.scrollIntoView({ behavior: "smooth" });
  }, [day, searchParams, setSearchParams]);

  return { day, goToDay };
};

const Schedule = ({
  schedule,
  goToDay,
}: {
  schedule: GroupSchedule[];
  goToDay: (day: AnyDay) => any;
}) => {
  const commonButtonArgs = { goToDay, schedule };

  return (
    <div>
      <h1>Розклад</h1>

      <Divider />
      <br />

      <div>
        <ButtonGroup variant="outlined" fullWidth={true}>
          <GoToDayButton {...commonButtonArgs} day={RelativeDay.Today} />
          <GoToDayButton {...commonButtonArgs} day={RelativeDay.Tomorrow} />
          <GoToDayButton {...commonButtonArgs} day={DayOfWeek.Monday} />
          <GoToDayButton {...commonButtonArgs} day={DayOfWeek.Tuesday} />
          <GoToDayButton {...commonButtonArgs} day={DayOfWeek.Wednesday} />
          <GoToDayButton {...commonButtonArgs} day={DayOfWeek.Thursday} />
          <GoToDayButton {...commonButtonArgs} day={DayOfWeek.Friday} />
        </ButtonGroup>
      </div>

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
          onInputChange={(event, value) => {
            setGroup(value);
            goToDay(null);
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
