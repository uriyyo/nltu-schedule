export type GroupsSchedules = Record<string, Group>;

export interface Group {
  group: string;
  subgroups: string[];
  schedule: GroupSchedule[];
}

export interface GroupSchedule {
  day: string;
  events: ScheduleEvent[];
}

export interface ScheduleEvent {
  time: string;
  order: number;
  event: DayEvent;
}

export interface SingleDayEvent {
  type: "single";
  event: string;
}

export interface VerticalDayEvent {
  type: "vertical";
  events: SubEvent[];
}

export interface HorizontalDayEvent {
  type: "horizontal";
  events: SubEvent[];
}

export type DayEvent = SingleDayEvent | VerticalDayEvent | HorizontalDayEvent;

export interface SubEventEmpty {
  type: "empty";
}

export interface SubEventSingle {
  type: "single";
  event: string;
}

export interface SubEventMultiple {
  type: "multiple";
  events: string[];
}

type SubEvent = SubEventEmpty | SubEventSingle | SubEventMultiple;

export enum DayOfWeek {
  Monday = "Понеділок",
  Tuesday = "Вівторок",
  Wednesday = "Середа",
  Thursday = "Четвер",
  Friday = "Пятниця",
}

export enum RelativeDay {
  Today = "Сьогодні",
  Tomorrow = "Завтра",
}

export type AnyDay = DayOfWeek | RelativeDay;
