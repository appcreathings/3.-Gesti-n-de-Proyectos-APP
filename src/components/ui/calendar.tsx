import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames: userClassNames, locale: _locale, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn("p-3", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center items-center relative h-8",
        caption_label: "text-sm font-medium text-foreground",
        nav: "flex items-center gap-1 absolute inset-x-0 top-0 h-8 justify-between",
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0",
          "text-foreground opacity-70 hover:bg-accent hover:text-accent-foreground hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0",
          "text-foreground opacity-70 hover:bg-accent hover:text-accent-foreground hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
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
        Chevron: ({ orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...props} />
          ) : (
            <ChevronRight className="h-4 w-4" {...props} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
