import ButtonGroup from "@/components/ui/primitive-button-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ButtonGroupDemo() {
  return (
    <ButtonGroup>
      <Button
        variant="ghost"
        size="sm"
        className="text-[color:var(--bjork-text-muted)] hover:bg-[var(--bjork-surface-hover)] hover:text-[color:var(--bjork-text)]"
      >
        Day
      </Button>
      <Button
        size="sm"
        className={cn(
          "border border-transparent bg-[var(--bjork-field)] text-[color:var(--bjork-text)]",
          "shadow-[var(--bjork-shadow-surface)] hover:bg-[var(--bjork-surface-hover)]",
        )}
      >
        Week
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-[color:var(--bjork-text-muted)] hover:bg-[var(--bjork-surface-hover)] hover:text-[color:var(--bjork-text)]"
      >
        Month
      </Button>
    </ButtonGroup>
  );
}
