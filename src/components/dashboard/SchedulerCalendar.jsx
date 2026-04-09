import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
  Video, FileImage, Radio, Bell, BellOff, Trash2, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG = {
  post:  { label: "Post",   icon: FileImage, color: "text-accent",   bg: "bg-accent/15 border-accent/30" },
  video: { label: "Video",  icon: Video,     color: "text-primary",  bg: "bg-primary/15 border-primary/30" },
  live:  { label: "Live",   icon: Radio,     color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
};

const INITIAL_EVENTS = [
  { id: 1, date: "2026-04-11", time: "10:00", title: "Workout mattutino — tutorial HIIT", type: "video", notify: true },
  { id: 2, date: "2026-04-14", time: "18:30", title: "Live Q&A con i fan", type: "live", notify: true },
  { id: 3, date: "2026-04-17", time: "12:00", title: "Nuove ricette fit della settimana", type: "post", notify: false },
  { id: 4, date: "2026-04-21", time: "20:00", title: "Full Body HIIT — sessione serale", type: "live", notify: true },
  { id: 5, date: "2026-04-25", time: "09:00", title: "Piano alimentare aprile", type: "post", notify: true },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
}

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

export default function SchedulerCalendar() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);

  // Form state
  const [form, setForm] = useState({ title: "", time: "12:00", type: "post", notify: true });

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const getEventsForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const openNew = (day) => {
    setSelectedDay(day);
    setEditEvent(null);
    setForm({ title: "", time: "12:00", type: "post", notify: true });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setForm({ title: ev.title, time: ev.time, type: ev.type, notify: ev.notify });
    setShowModal(true);
  };

  const saveEvent = () => {
    if (!form.title.trim()) return;
    if (editEvent) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...form } : e));
    } else {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      setEvents(prev => [...prev, { id: Date.now(), date: dateStr, ...form }]);
    }
    setShowModal(false);
  };

  const deleteEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id));
  const toggleNotify = (id) => setEvents(prev => prev.map(e => e.id === id ? { ...e, notify: !e.notify } : e));

  // Upcoming events sorted
  const upcoming = [...events]
    .filter(e => e.date >= today.toISOString().split("T")[0])
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card/50 border border-border/30 rounded-2xl p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-bold text-base">
              {MONTHS_IT[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_IT.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => openNew(day)}
                  className={`relative min-h-[52px] rounded-xl p-1.5 text-left flex flex-col transition-all group border ${
                    isToday
                      ? "border-primary/50 bg-primary/5"
                      : "border-transparent hover:border-border/40 hover:bg-secondary/40"
                  }`}
                >
                  <span className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground/80"
                  }`}>
                    {day}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map(ev => {
                      const cfg = TYPE_CONFIG[ev.type];
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className={`text-[9px] font-medium px-1 py-0.5 rounded border truncate ${cfg.bg} ${cfg.color} cursor-pointer hover:opacity-80`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</span>
                    )}
                  </div>
                  <Plus className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 absolute top-1.5 right-1.5 transition-all" />
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/20">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-sm">Prossimi eventi</h3>
            <Button size="sm" onClick={() => openNew(today.getDate())} className="h-7 text-xs bg-primary hover:bg-primary/90 px-2.5">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nuovo
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {upcoming.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nessun evento pianificato</p>
            )}
            {upcoming.map((ev, i) => {
              const cfg = TYPE_CONFIG[ev.type];
              const Icon = cfg.icon;
              const dateObj = new Date(ev.date + "T" + ev.time);
              const dateLabel = dateObj.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{ev.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{dateLabel} · {ev.time}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => toggleNotify(ev.id)}
                        className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all ${
                          ev.notify
                            ? "bg-chart-3/10 border-chart-3/30 text-chart-3"
                            : "bg-secondary border-border/20 text-muted-foreground"
                        }`}
                      >
                        {ev.notify ? <Bell className="w-2.5 h-2.5" /> : <BellOff className="w-2.5 h-2.5" />}
                        {ev.notify ? "Notifica attiva" : "Notifica off"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ev)} className="p-1 hover:text-primary transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteEvent(ev.id)} className="p-1 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-base">
                  {editEvent ? "Modifica evento" : `Pianifica — ${selectedDay} ${MONTHS_IT[currentMonth]}`}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Type selector */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Tipo di contenuto</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setForm(f => ({ ...f, type: key }))}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                            form.type === key ? `${cfg.bg} ${cfg.color}` : "border-border/30 text-muted-foreground hover:border-border/60"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Titolo *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Es. Live Q&A con i fan"
                    className="bg-secondary/30 border-border/30 h-10"
                  />
                </div>

                {/* Time */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Orario</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                    className="bg-secondary/30 border-border/30 h-10 w-36"
                  />
                </div>

                {/* Notify toggle */}
                <div className="flex items-center justify-between py-3 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Notifica automatica ai fan</p>
                      <p className="text-xs text-muted-foreground">Invia email e push notification</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.notify}
                    onCheckedChange={(v) => setForm(f => ({ ...f, notify: v }))}
                  />
                </div>

                {form.notify && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-2 text-xs text-chart-3 bg-chart-3/5 border border-chart-3/20 rounded-xl px-3 py-2"
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    I tuoi fan riceveranno una notifica 1 ora prima e al momento della pubblicazione.
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                {editEvent && (
                  <Button
                    variant="outline"
                    onClick={() => { deleteEvent(editEvent.id); setShowModal(false); }}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 h-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-10">Annulla</Button>
                <Button
                  onClick={saveEvent}
                  disabled={!form.title.trim()}
                  className="flex-1 h-10 bg-primary hover:bg-primary/90 glow-primary font-semibold"
                >
                  {editEvent ? "Salva modifiche" : "Pianifica"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}