import React, { useEffect, useState } from "react";
import {
  Card,
  Container,
  Autocomplete,
  TextField,
  Box,
  Grid,
  Typography,
} from "@mui/material";
import data from "./data.json";
import { useSearchParams } from "react-router-dom";

const EVENT_COLORS = ["#4db6ac", "#b2dfdb"];

function BoxSx(props: any) {
  let { width, hidden, ...rest } = props;

  return (
    <Box
      {...rest}
      hidden={hidden}
      visibility={hidden ? "hidden" : "visible"}
      sx={{
        backgroundColor: EVENT_COLORS[0],
        height: "200px",
        margin: "10px",
        ...(rest.sx ?? {}),
      }}
    >
      {props.children}
    </Box>
  );
}

function EventContent(props: any) {
  return (
    <BoxSx
      margin={"10px"}
      sx={{ backgroundColor: EVENT_COLORS[0], ...(props?.sx ?? {}) }}
      display={"flex"}
      flexDirection={"column"}
      justifyContent={"center"}
    >
      <Typography textAlign={"center"} mt={2}>
        {props.children}
      </Typography>
    </BoxSx>
  );
}

function VerticalEvent(props: any) {
  let { events } = props;
  let size = 12 / events.length;

  let mapVerticalEvents = (event: any) => {
    if (!event) return <BoxSx sx={{ backgroundColor: "white" }}></BoxSx>;

    let { type, events, ...rest } = event;
    if (type === "single") return <EventContent>{rest.event}</EventContent>;

    return <div>Unknown vertical event</div>;
  };

  return (
    <>
      {events.map((it: any) => (
        <Grid item xs={size}>
          {mapVerticalEvents(it)}
        </Grid>
      ))}
    </>
  );
}

function HorizontalEvent(props: any) {
  let { events } = props;

  const mapHorizontalEvents = (event: any, color: string) => {
    if (!event) {
      return <BoxSx sx={{ backgroundColor: "white", height: "100px" }}></BoxSx>;
    }

    let { type, events, ...rest } = event;

    if (type === "single") {
      return (
        <EventContent sx={{ backgroundColor: color, height: "100px" }}>
          {rest.event}
        </EventContent>
      );
    }

    let size = 12 / events.length;

    return (
      <Grid container>
        {events.map((it: any) => (
          <Grid xs={size}>
            {!it ? (
              <BoxSx sx={{ backgroundColor: "white" }}></BoxSx>
            ) : (
              <EventContent sx={{ backgroundColor: color }}>{it}</EventContent>
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      {events.map((it: any, idx: number) => (
        <Grid item xs={12}>
          {mapHorizontalEvents(it, EVENT_COLORS[idx % 2])}
        </Grid>
      ))}
    </>
  );
}

function SingleEvent(props: any) {
  let { event } = props;

  return (
    <Grid item xs={12}>
      <EventContent>{event}</EventContent>
    </Grid>
  );
}

function DayEvent(props: any) {
  let { event } = props;

  if (event.type === "single") return <SingleEvent {...event} />;
  if (event.type === "vertical") return <VerticalEvent {...event} />;
  if (event.type === "horizontal") return <HorizontalEvent {...event} />;

  return <div>Unknown event type</div>;
}

function DayInfo(props: any) {
  let { time, order, event } = props;

  return (
    <div>
      <h3>
        {order} Пара (Початок {time})
      </h3>

      <Grid container>
        <DayEvent event={event}></DayEvent>
      </Grid>
    </div>
  );
}

function Day(props: any) {
  let { day, events } = props;

  return (
    <div>
      <h2>{day}</h2>

      {events.map((it: any) => (
        <DayInfo key={it.time} {...it} />
      ))}
    </div>
  );
}

function Schedule(props: any) {
  let { schedule } = props.schedule;

  return (
    <div>
      <h1>Розклад</h1>
      <>
        {schedule.map((it: any) => (
          <>
            <Day key={it.day} day={it.day} events={it.events} />
            <br />
          </>
        ))}
      </>
    </div>
  );
}

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  let [group, setGroup] = useState<string | null>(searchParams.get("group"));
  let [schedule, setSchedule] = useState<any>(null);

  useEffect(() => {
    if (!group) return;

    setSearchParams({ group });
    data
      .filter((it: any) => it.group === group)
      .forEach(({ schedule }) => setSchedule(schedule));
  }, [group, setSearchParams]);

  return (
    <div className="App">
      <Container maxWidth="md">
        <h1>НЛТУ Розклад занять для спеціальностей КН, ІСТ, ІПЗ</h1>

        <Autocomplete
          value={group}
          disablePortal
          id="group"
          options={data.map((it: any) => it.group)}
          onInputChange={(event, value) => setGroup(value)}
          renderInput={(params) => <TextField {...params} label="Група" />}
        />

        <br />

        {schedule && (
          <Card variant="outlined" sx={{ padding: "10px" }}>
            <Schedule schedule={{ schedule }} />
          </Card>
        )}
      </Container>
    </div>
  );
}

export default App;
