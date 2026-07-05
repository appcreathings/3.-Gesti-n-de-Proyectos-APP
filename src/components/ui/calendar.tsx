import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps, useDayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function CalendarCaption({ calendarMonth }: { calendarMonth: import("react-day-picker").CalendarMonth }) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  
  const currentMonth = calendarMonth.date;
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const monthNames = Array.from({ length: 12 }, (_, i) => 
    new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2000, i, 1))
  );
  
  const startYear = currentYear - 100;
  const endYear = currentYear + 20;

  return (
    <div className="flex items-center gap-2 h-8 justify-center">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0 text-foreground opacity-70 hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <select
          value={currentMonthIndex}
          onChange={(e) => {
            const newDate = new Date(currentYear, Number(e.target.value), 1);
            goToMonth(newDate);
          }}
          className="bg-background border border-input rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Seleccionar mes"
        >
          {monthNames.map((name: string, index: number) => (
            <option key={index} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => {
            const newDate = new Date(Number(e.target.value), currentMonthIndex, 1);
            goToMonth(newDate);
          }}
          className="bg-background border border-input rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Seleccionar año"
        >
          {Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0 text-foreground opacity-70 hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames: userClassNames,
  locale: _locale,
  showOutsideDays = true,
  captionLayout = "dropdown",
  ...props
}: CalendarProps) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear() - 100, 0, 1);
  const endMonth = new Date(now.getFullYear() + 20, 11, 31);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      className={cn("p-3", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "m-0",
        caption_label: "hidden",
        dropdowns: "flex items-center gap-2",
        dropdown: "bg-background border border-input rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        months_dropdown: "text-sm font-medium",
        years_dropdown: "text-sm font-medium",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "h-9 w-9 text-center text-[0.8rem] font-normal text-muted-foreground",
        weeks: "",
        week: "flex w-full mt-2",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          "h-9 w-9 rounded-md p-0 text-sm font-normal text-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        focused: "ring-2 ring-ring ring-offset-2",
        range_middle: "bg-accent text-accent-foreground rounded-none",
        range_start: "rounded-r-none",
        range_end: "rounded-l-none",
        ...userClassNames,
      }}
      components={{
        MonthCaption: CalendarCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
