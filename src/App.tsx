import React, { useEffect, useState } from "react";
import {
  Card,
  Container,
  Autocomplete,
  TextField,
  Box,
  Grid,
  Typography,
  Divider,
} from "@mui/material";
import data from "./data.json";
import { useSearchParams } from "react-router-dom";

const xsSizeForArray = (arr: any[]) => 12 / arr.length;

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

const EventContent = ({ children, sx, ...rest }: any) => (
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

const VerticalEvent = ({ events }: any) => (
    <>
        {events.map(({type, event}: any, idx: number) => (
            <Grid item key={idx} xs={xsSizeForArray(events)}>
                {type === "empty" ? (
                    <EventBox empty={true}/>
                ) : type === "single" ? (
                    <EventContent>{event}</EventContent>
                ) : (
                    <div>Unknown vertical event</div>
                )}
            </Grid>
        ))}
    </>
);

const HorizontalEvent = ({ events }: any) => {
  const mapHorizontalEvents = (
    { type, event, events }: any,
    nominator: boolean,
  ) => {
    if (type === "empty")
      return <EventBox halfHeight={true} nominator={nominator} empty={true} />;
    if (type === "single")
      return (
        <EventContent halfHeight={true} nominator={nominator}>
          {event}
        </EventContent>
      );

    return (
      <Grid container>
        {events.map((it: any, idx: number) => (
          <Grid key={idx} xs={xsSizeForArray(events)}>
            {it ? (
              <EventContent nominator={nominator}>{it}</EventContent>
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
      {events.map((it: any, idx: number) => (
        <Grid key={idx} item xs={12}>
          {mapHorizontalEvents(it, idx % 2 === 0)}
        </Grid>
      ))}
    </>
  );
};

const SingleEvent = ({ event }: any) => (
    <Grid item xs={12}>
        <EventContent>{event}</EventContent>
    </Grid>
);

function DayEvent({ event }: any) {
  if (event.type === "single") return <SingleEvent {...event} />;
  if (event.type === "vertical") return <VerticalEvent {...event} />;
  if (event.type === "horizontal") return <HorizontalEvent {...event} />;

  return <div>Unknown event type</div>;
}

const DayInfo = ({ time, order, event }: any) => (
    <div>
      <h3>
        {order} Пара (Початок {time})
      </h3>
      <Grid container>
        <DayEvent event={event}></DayEvent>
      </Grid>
    </div>
);

const Day = ({ day, events }: any) => (
    <div>
      <h2>{day}</h2>

      {events.map((it: any) => (
          <DayInfo key={it.time} {...it} />
      ))}
    </div>
);

const  Schedule = ({ schedule }: any) => (
    <div>
      <h1>Розклад</h1>
      <>
        {schedule.map(({ day, events }: any, idx: number) => (
          <div key={idx}>
            <Divider />
            <Day key={day} day={day} events={events} />
            <br />
          </div>
        ))}
      </>
    </div>
  );


function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [group, setGroup] = useState(searchParams.get("group"));
  const [schedule, setSchedule] = useState(null);

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
            <Schedule schedule={schedule} />
          </Card>
        )}
      </Container>
    </div>
  );
}

export default App;
