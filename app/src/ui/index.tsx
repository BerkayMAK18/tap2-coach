/**
 * Eigener UI-Baukasten der Lern-App (neutral, ohne Firmen-Branding).
 *
 * Hintergrund: Die Vorlage „learnlab“ nutzte ein firmeninternes Designsystem (BI X), das weder
 * Schriften noch Marken noch Komponenten in ein öffentliches Repo bringen darf. Dieser Baukasten
 * ersetzt es mit derselben Schnittstelle (Komponentennamen und Props), damit Seiten und Logik
 * unverändert weiterlaufen. Er baut auf Radix-Primitives (Barrierefreiheit) und Tailwind-Tokens
 * aus `src/theme/tokens.css` auf.
 *
 * Konventionen
 * - Farbnamen sind semantisch: ink (Text/dunkle Flächen), brand (Akzent), canvas (Seitengrund),
 *   sand, slate, highlight sowie Tonfamilien `tone-<name>-<stufe>`.
 * - Varianten: Button `solid | ink | brand | ghost | outline`, Card `surface: white | ink | brand`.
 * - Neue Komponenten hier ergänzen, nicht direkt in Seiten nachbauen.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
  ArrowLeft, BookOpen, Check, CheckCircle2, ChevronDown, Clock, Lightbulb, Link2, Loader2, LogOut, Menu,
  MessageSquareText, Mic, Paperclip, Plus, RefreshCw, Send, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Icon / Logo */

/** Symbolnamen aus der Vorlage → lucide-Icons. Neue Namen hier eintragen. */
const ICONS: Record<string, LucideIcon> = {
  add: Plus, plus: Plus, "arrow-circular": RefreshCw, "arrow-left": ArrowLeft, "book-open": BookOpen,
  "chain-linked": Link2, "check-circle": CheckCircle2, check: Check, clock: Clock, close: X, cross: X,
  "door-open-wave": LogOut, hamburger: Menu, "lightbulb-radiate": Lightbulb, microphone: Mic,
  "paper-airplane": Send, "paper-clip": Paperclip, "speech-bubble-lines": MessageSquareText,
};

export function Icon({ name, size = 20, className, ...rest }: { name: string; size?: number; className?: string } & React.SVGProps<SVGSVGElement>) {
  const C = ICONS[name] ?? CheckCircle2;
  return <C width={size} height={size} aria-hidden="true" className={className} {...(rest as object)} />;
}

/** Wortmarke der App (eigene Gestaltung). */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-head font-bold", className)} style={{ fontSize: size * 0.55 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="hsl(var(--brand))" />
        <path d="M9 21.5 15 9l6 12.5M11.4 17h7.2" stroke="hsl(var(--ink))" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23.5" cy="22.5" r="2.5" fill="hsl(var(--ink))" />
      </svg>
      <span>TAP2 Coach</span>
    </span>
  );
}

/* ------------------------------------------------------------------ Button */

const BTN_VARIANT: Record<string, string> = {
  solid: "bg-brand text-ink hover:bg-brand/85",
  ink: "bg-ink text-canvas hover:bg-ink/90",
  brand: "bg-brand/15 text-ink hover:bg-brand/25",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  outline: "border border-border bg-card text-ink hover:bg-ink/5",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};
const BTN_SIZE: Record<string, string> = {
  sm: "h-8 px-3 text-body-200 gap-1.5",
  md: "h-10 px-4 text-body-300 gap-2",
  lg: "h-12 px-6 text-body-400 gap-2",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BTN_VARIANT | string;
  size?: keyof typeof BTN_SIZE | string;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "solid", size = "md", asChild, loading, disabled, className, children, ...props }, ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full font-text font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        BTN_VARIANT[variant] ?? BTN_VARIANT.solid, BTN_SIZE[size] ?? BTN_SIZE.md, className,
      )}
      {...props}
    >
      {asChild ? children : <>{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{children}</>}
    </Comp>
  );
});

/* ------------------------------------------------------------------ Card, Badge, Texte */

const SURFACE: Record<string, string> = {
  white: "bg-card text-card-foreground border border-border",
  ink: "bg-ink text-canvas",
  brand: "bg-brand/15 text-ink",
};
const PAD: Record<string, string> = { sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ surface = "white", size = "md", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { surface?: string; size?: string }) {
  return <div className={cn("rounded-xl", SURFACE[surface] ?? SURFACE.white, PAD[size] ?? PAD.md, className)} {...props} />;
}

export function CardEyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-100 font-medium uppercase tracking-wider opacity-70", className)} {...props} />;
}

const BADGE: Record<string, string> = {
  brand: "bg-brand/20 text-ink", white: "bg-card text-ink border border-border", ink: "bg-ink text-canvas",
  success: "bg-tone-success-light text-ink", warning: "bg-tone-warning-light text-ink", error: "bg-tone-error-light text-ink",
};
export function Badge({ variant = "brand", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-100 font-medium", BADGE[variant] ?? BADGE.brand, className)} {...props} />;
}

export function InlineError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p role="alert" className={cn("text-body-200 text-destructive", className)} {...props} />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center", className)}>
      {icon && <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-ink">{icon}</div>}
      <h3 className="font-head text-heading-100">{title}</h3>
      {description && <p className="max-w-md text-body-300 text-slate">{description}</p>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ Formulare */

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(function Label({ className, ...props }, ref) {
  return <LabelPrimitive.Root ref={ref} className={cn("text-body-200 font-medium text-ink", className)} {...props} />;
});

const FIELD = "w-full rounded-lg border border-input bg-card px-3 text-body-300 text-ink placeholder:text-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD, "h-10", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD, "min-h-24 py-2", className)} {...props} />;
});

/** Dateiauswahl mit Größenprüfung. `value`/`onFilesChange` arbeiten mit File[]. */
export function FileUpload({ value, onFilesChange, accept, maxSize, label = "Datei auswählen", hint, disabled, multiple }: {
  value: File[]; onFilesChange: (files: File[]) => void; accept?: string; maxSize?: number; label?: string; hint?: string; disabled?: boolean; multiple?: boolean;
}) {
  const [err, setErr] = React.useState("");
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-3 text-body-200", disabled && "pointer-events-none opacity-50")}>
        <Paperclip className="h-4 w-4" aria-hidden="true" /><span className="font-medium">{label}</span>
        {value.length > 0 && <span className="truncate text-slate">· {value.map((f) => f.name).join(", ")}</span>}
      </label>
      <input id={id} type="file" className="sr-only" accept={accept} multiple={multiple} disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const tooBig = maxSize ? files.find((f) => f.size > maxSize) : undefined;
          setErr(tooBig ? `${tooBig.name} ist zu groß.` : "");
          onFilesChange(tooBig ? [] : files);
          e.target.value = "";
        }} />
      {hint && <p className="text-body-100 text-slate">{hint}</p>}
      {err && <InlineError>{err}</InlineError>}
    </div>
  );
}

/* ------------------------------------------------------------------ Progress, Tabelle, Tabs */

export function Progress({ value = 0, className, ...props }: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-ink/10", className)} value={value} {...props}>
      <ProgressPrimitive.Indicator className="h-full bg-brand transition-all" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </ProgressPrimitive.Root>
  );
}

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => <div className="w-full overflow-x-auto"><table className={cn("w-full border-collapse text-body-200", className)} {...p} /></div>;
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />;
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn("border-b border-border", className)} {...p} />;
export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn("px-3 py-2 text-left font-medium", className)} {...p} />;
export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("px-3 py-2 align-top", className)} {...p} />;

/** Einfache Tabs ohne zusätzliche Abhängigkeit (kontrolliert oder unkontrolliert). */
const TabsCtx = React.createContext<{ value: string; set: (v: string) => void }>({ value: "", set: () => {} });
export function Tabs({ value, defaultValue = "", onValueChange, className, children }: { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; className?: string; children: React.ReactNode }) {
  const [inner, setInner] = React.useState(defaultValue);
  const cur = value ?? inner;
  return <TabsCtx.Provider value={{ value: cur, set: (v) => { setInner(v); onValueChange?.(v); } }}><div className={className}>{children}</div></TabsCtx.Provider>;
}
export function TabsList({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("inline-flex gap-1 rounded-full bg-ink/5 p-1", className)} {...p} />;
}
export function TabsTrigger({ value, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const t = React.useContext(TabsCtx);
  const on = t.value === value;
  return <button type="button" role="tab" aria-selected={on} onClick={() => t.set(value)} className={cn("rounded-full px-4 py-1.5 text-body-200 font-medium", on ? "bg-card text-ink shadow-sm" : "text-slate", className)} {...p} />;
}
export function TabsContent({ value, ...p }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const t = React.useContext(TabsCtx);
  return t.value === value ? <div role="tabpanel" {...p} /> : null;
}

/* ------------------------------------------------------------------ Accordion, Select, Tooltip */

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) => <AccordionPrimitive.Item className={cn("border-b border-border", className)} {...p} />;
export const AccordionTrigger = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger className={cn("flex flex-1 items-center justify-between py-3 text-left font-medium [&[data-state=open]>svg]:rotate-180", className)} {...p}>
      {children}<ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);
export const AccordionContent = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) => <AccordionPrimitive.Content className={cn("pb-4", className)} {...p} />;

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectTrigger = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger className={cn(FIELD, "flex h-10 items-center justify-between", className)} {...p}>
    {children}<SelectPrimitive.Icon><ChevronDown className="h-4 w-4" aria-hidden="true" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);
export const SelectContent = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content position="popper" sideOffset={4} className={cn("z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-overlay", className)} {...p}>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);
export const SelectItem = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item className={cn("relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-body-200 outline-none data-[highlighted]:bg-ink/5", className)} {...p}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = ({ className, sideOffset = 6, ...p }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={sideOffset} className={cn("z-50 rounded-md bg-ink px-2.5 py-1 text-body-100 text-canvas", className)} {...p} /></TooltipPrimitive.Portal>
);

/* ------------------------------------------------------------------ Dialoge: Sheet, ConfirmDialog */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetTitle = DialogPrimitive.Title;
export function SheetContent({ side = "left", className, children, ...p }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40" />
      <DialogPrimitive.Content className={cn("fixed inset-y-0 z-50 w-72 max-w-[85vw] bg-card p-4 shadow-overlay", side === "left" ? "left-0" : "right-0", className)} {...p}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Bestätigen", cancelLabel = "Abbrechen", tone, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode;
  confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "default" | string; onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl bg-card p-6 shadow-overlay">
          <DialogPrimitive.Title className="font-head text-heading-100">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="text-body-300 text-slate">{description}</DialogPrimitive.Description>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
            <Button variant={tone === "danger" ? "destructive" : "ink"} onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ Toasts */

type ToastItem = { id: number; title: React.ReactNode; description?: React.ReactNode; variant?: "success" | "error" | "info" | string };
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
function emit() { listeners.forEach((l) => l()); }

/** Gleiche Aufrufform wie in der Vorlage: `const { toast } = useToast(); toast({ title, description, variant })`. */
export function useToast() {
  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = nextId++;
    toasts = [...toasts, { ...t, id }]; emit();
    setTimeout(() => { toasts = toasts.filter((x) => x.id !== id); emit(); }, 4500);
  }, []);
  return { toast };
}

/** Rendert die Toast-Liste; optional als Hülle um die App (`<Toaster><Outlet /></Toaster>`), wie in der Vorlage. */
export function Toaster({ children }: { children?: React.ReactNode }) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { listeners.add(force); return () => { listeners.delete(force); }; }, []);
  return (
    <>
    {children}
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,92vw)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn("rounded-lg border p-3 shadow-overlay bg-card text-ink", t.variant === "error" ? "border-destructive" : t.variant === "success" ? "border-tone-success-main" : "border-border")}>
          <p className="font-medium">{t.title}</p>
          {t.description && <p className="text-body-200 text-slate">{t.description}</p>}
        </div>
      ))}
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ Spinner, Switch, Slider, Breadcrumbs */

export function Spinner({ size = "md", label, className }: { size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  const px = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-slate", className)}>
      <Loader2 className={cn(px, "animate-spin")} aria-hidden="true" />
      {label && <span className="text-body-200">{label}</span>}
    </span>
  );
}

export const Switch = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-ink data-[state=unchecked]:bg-input", className)}
    {...p}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
);

export const Slider = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) => (
  <SliderPrimitive.Root className={cn("relative flex w-full touch-none select-none items-center", className)} {...p}>
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full bg-ink" />
    </SliderPrimitive.Track>
    {(p.value ?? p.defaultValue ?? [0]).map((_, i) => (
      <SliderPrimitive.Thumb key={i} className="block h-5 w-5 rounded-full border-2 border-ink bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    ))}
  </SliderPrimitive.Root>
);

type Crumb = { label: React.ReactNode; href?: string };
/** Brotkrumen-Navigation. `renderLink` erlaubt Router-Links statt <a>. */
export function Breadcrumbs({ items, renderLink, className }: {
  items: Crumb[];
  renderLink?: (p: { href: string; className: string; children: React.ReactNode }) => React.ReactNode;
  className?: string;
}) {
  const linkCls = "text-slate underline-offset-4 hover:text-ink hover:underline";
  return (
    <nav aria-label="Brotkrumen" className={cn("text-body-200", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-slate">/</span>}
            {c.href && i < items.length - 1
              ? (renderLink ? renderLink({ href: c.href, className: linkCls, children: c.label }) : <a href={c.href} className={linkCls}>{c.label}</a>)
              : <span aria-current={i === items.length - 1 ? "page" : undefined} className="font-medium text-ink">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
