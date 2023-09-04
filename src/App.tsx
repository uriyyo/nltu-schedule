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
  let {
    width,
    nominator = true,
    halfHeight = false,
    empty = false,
    sx = {},
    ...rest
  } = props;
  let color = nominator ? EVENT_COLORS[0] : EVENT_COLORS[1];
  color = empty ? "white" : color;
  if (!empty) {
    sx.borderColor = "#bdbdbd";
    sx.border = "1 px";
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
      {props.children}
    </Box>
  );
}

function EventContent(props: any) {
  let { children, sx, ...rest } = props;

  return (
    <BoxSx
      margin={"10px"}
      display={"flex"}
      flexDirection={"column"}
      justifyContent={"center"}
      {...rest}
    >
      <Typography textAlign={"center"} mt={2}>
        {children}
      </Typography>
    </BoxSx>
  );
}

function VerticalEvent(props: any) {
  let { events } = props;
  let size = 12 / events.length;

  let mapVerticalEvents = (verticalEvent: any) => {
    let { type, event } = verticalEvent;

    if (type === "empty") return <BoxSx empty={true} />;
    if (type === "single") return <EventContent>{event}</EventContent>;

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

  const mapHorizontalEvents = (horizontalEvent: any, nominator: boolean) => {
    let { type, events, event } = horizontalEvent;

    if (type === "empty")
      return <BoxSx halfHeight={true} nominator={nominator} empty={true} />;
    if (type === "single")
      return (
        <EventContent halfHeight={true} nominator={nominator}>
          {event}
        </EventContent>
      );

    let size = 12 / events.length;

    return (
      <Grid container>
        {events.map((it: any) => (
          <Grid xs={size}>
            {!it ? (
              <BoxSx empty={true} />
            ) : (
              <EventContent nominator={nominator}>{it}</EventContent>
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
          {mapHorizontalEvents(it, idx % 2 === 0)}
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
    setSchedule((data as any)[group]?.schedule);
  }, [group, setSearchParams]);

  return (
    <div className="App">
      <Container maxWidth="md">
        <h1>НЛТУ Розклад занять для спеціальностей КН, ІСТ, ІПЗ</h1>

        <Autocomplete
          value={group}
          disablePortal
          id="group"
          options={Object.keys(data)}
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
