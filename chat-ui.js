import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  CalendarDays,
  Droplets,
  Sun,
  Sprout,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  X,
  Camera,
  MapPin,
  Bell,
  Tag,
  NotebookText,
  Flower2,
  FlaskConical,
  Recycle,
  Settings,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  Home,
} from "lucide-react";

/**
 * Plant Tracker – Modern Frontend Mock (Mobile‑first)
 * ------------------------------------------------------
 * • Responsive React UI with Tailwind
 * • Bottom navigation for mobile, top tabs for desktop
 * • Add Plant button opens a modal to create a plant
 * • Uses framer‑motion for subtle animations
 * • Demo only; state stored in memory
 */

// --- Lightweight UI Primitives ---
const Chip = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>{children}</span>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-4 ${className}`}>{children}</div>
);

const IconBtn = ({ children, onClick, label, className = "" }) => (
  <button
    aria-label={label}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition h-10 w-10 ${className}`}
  >
    {children}
  </button>
);

const Button = ({ children, onClick, className = "", type = "button", variant = "primary" }) => (
  <button
    type={type}
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition border ${
      variant === "primary"
        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
        : variant === "ghost"
        ? "bg-white border-slate-200/70 hover:bg-slate-50"
        : "bg-white border-slate-200/70"
    } ${className}`}
  >
    {children}
  </button>
);

// --- Sample Data ---
const initialPlants = [
  {
    id: "p1",
    name: "Monstera Deliciosa",
    variety: "Swiss Cheese Plant",
    location: "Living Room",
    moisture: 34,
    sun: "Bright Indirect",
    lastWatered: "2025-09-02",
    nextWater: "2025-09-06",
    nextFertilize: "2025-09-20",
    tags: ["tropical", "pet‑caution"],
    due: ["Water"],
    img: "https://images.unsplash.com/photo-1614594950633-95df4cfb27df?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p2",
    name: "Fiddle Leaf Fig",
    variety: "Ficus lyrata",
    location: "Office",
    moisture: 52,
    sun: "Bright",
    lastWatered: "2025-08-31",
    nextWater: "2025-09-07",
    nextFertilize: "2025-09-28",
    tags: ["tree", "statement"],
    due: ["Rotate"],
    img: "https://images.unsplash.com/photo-1614594950904-07d1f1f2a2f6?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p3",
    name: "Snake Plant",
    variety: "Sansevieria",
    location: "Bedroom",
    moisture: 63,
    sun: "Low to Medium",
    lastWatered: "2025-08-20",
    nextWater: "2025-09-15",
    nextFertilize: "2025-10-05",
    tags: ["low‑light", "air‑purifier"],
    due: [],
    img: "https://images.unsplash.com/photo-1602321350939-098f2d5a2f4b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p4",
    name: "Pothos",
    variety: "Epipremnum aureum",
    location: "Kitchen",
    moisture: 21,
    sun: "Medium",
    lastWatered: "2025-08-29",
    nextWater: "2025-09-05",
    nextFertilize: "2025-09-25",
    tags: ["trailing"],
    due: ["Water", "Fertilize"],
    img: "https://images.unsplash.com/photo-1614594951106-0f3a5d6aaf3e?q=80&w=1200&auto=format&fit=crop",
  },
];

const tasksTodayStatic = [
  { id: "t1", type: "Water", plantId: "p1", when: "Today" },
  { id: "t2", type: "Rotate", plantId: "p2", when: "Today" },
];

const propagations = {
  cuttings: [
    { id: "x1", name: "Golden Pothos", started: "2025-08-18", stage: "Rooting" },
    { id: "x2", name: "Philodendron Brasil", started: "2025-08-24", stage: "Rooting" },
  ],
  planted: [{ id: "x3", name: "ZZ Raven", started: "2025-07-01", stage: "Planted" }],
  established: [{ id: "x4", name: "Monstera Adansonii", started: "2025-06-10", stage: "Established" }],
};

// --- Helpers ---
const formatMoisture = (n) => `${n}%`;

const badgeFor = (t) => {
  switch (t) {
    case "Water":
      return (
        <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">
          <Droplets className="h-3 w-3 mr-1" />
          Water
        </Chip>
      );
    case "Fertilize":
      return (
        <Chip className="bg-amber-50 text-amber-700 ring-amber-200">
          <FlaskConical className="h-3 w-3 mr-1" />
          Fertilize
        </Chip>
      );
    case "Rotate":
      return (
        <Chip className="bg-sky-50 text-sky-700 ring-sky-200">
          <Sun className="h-3 w-3 mr-1" />
          Rotate
        </Chip>
      );
    default:
      return null;
  }
};

const SectionHeader = ({ icon: Icon, title, actions }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-slate-500" />
      <h3 className="text-sm font-semibold text-slate-700 tracking-wide">{title}</h3>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

// --- Plant Card ---
const PlantCard = ({ plant, onOpen }) => (
  <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="p-0 overflow-hidden">
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img src={plant.img} alt="plant" className="h-full w-full object-cover" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{plant.name}</h4>
            <p className="text-xs text-slate-500">
              {plant.variety} • {plant.location}
            </p>
          </div>
          <Button variant="ghost" onClick={() => onOpen(plant)} className="!px-2 !py-1">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {plant.due.length === 0 ? (
            <Chip className="bg-slate-50 text-slate-600 ring-slate-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Up to date
            </Chip>
          ) : (
            plant.due.map((d) => (
              <span key={d}>{badgeFor(d)}</span>
            ))
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Card className="p-2">
            <div className="text-[10px] text-slate-500">Moisture</div>
            <div className="text-sm font-semibold text-slate-800">{formatMoisture(plant.moisture)}</div>
          </Card>
          <Card className="p-2">
            <div className="text-[10px] text-slate-500">Next Water</div>
            <div className="text-sm font-semibold text-slate-800">{plant.nextWater}</div>
          </Card>
          <Card className="p-2">
            <div className="text-[10px] text-slate-500">Fertilize</div>
            <div className="text-sm font-semibold text-slate-800">{plant.nextFertilize}</div>
          </Card>
        </div>
      </div>
    </Card>
  </motion.div>
);

// --- Detail Drawer ---
const Drawer = ({ open, onClose, plant }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
      >
        <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
        <motion.div
          initial={{ x: 500 }}
          animate={{ x: 0 }}
          exit={{ x: 500 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">{plant?.name}</h3>
            </div>
            <IconBtn onClick={onClose} label="Close">
              <X className="h-5 w-5" />
            </IconBtn>
          </div>

          <div className="mt-4 space-y-4">
            <Card className="p-0 overflow-hidden">
              <img src={plant?.img} alt="plant" className="h-48 w-full object-cover" />
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Tag className="h-4 w-4" />Variety
                  <span className="ml-auto font-medium text-slate-800">{plant?.variety}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />Location
                  <span className="ml-auto font-medium text-slate-800">{plant?.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Droplets className="h-4 w-4" />Moisture
                  <span className="ml-auto font-medium text-slate-800">{formatMoisture(plant?.moisture ?? 0)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Sun className="h-4 w-4" />Sun
                  <span className="ml-auto font-medium text-slate-800">{plant?.sun}</span>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader
                icon={CalendarDays}
                title="Care Schedule"
                actions={
                  <Button variant="ghost">
                    <Bell className="h-4 w-4" /> Remind me
                  </Button>
                }
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-500">Next Water</div>
                  <div className="font-medium text-slate-800">{plant?.nextWater}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-500">Fertilize</div>
                  <div className="font-medium text-slate-800">{plant?.nextFertilize}</div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader
                icon={NotebookText}
                title="Notes"
                actions={
                  <IconBtn label="Add note">
                    <Plus className="h-4 w-4" />
                  </IconBtn>
                }
              />
              <p className="mt-2 text-sm text-slate-600">
                Low‑maintenance. Likes to dry out slightly. Prop‑friendly.
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost">
                <Camera className="h-4 w-4" /> Add Photo
              </Button>
              <Button>
                <Droplets className="h-4 w-4" /> Log Watering
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Calendar Mock ---
const CalendarMock = () => (
  <Card>
    <SectionHeader
      icon={CalendarDays}
      title="September 2025"
      actions={
        <div className="flex gap-2">
          <IconBtn label="Prev">
            <ChevronLeft className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Next">
            <ChevronRight className="h-4 w-4" />
          </IconBtn>
        </div>
      }
    />
    <div className="mt-4 grid grid-cols-7 gap-1 text-xs">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="text-center text-slate-500 font-medium py-1">
          {d}
        </div>
      ))}
      {Array.from({ length: 30 }).map((_, i) => {
        const day = i + 1;
        const isToday = day === 6;
        const isDue = day === 6 || day === 7 || day === 20;
        return (
          <div
            key={day}
            className={`aspect-square rounded-xl border text-slate-700 relative ${
              isToday ? "border-emerald-500" : "border-slate-200"
            } p-1`}
          >
            <div
              className={`absolute top-1 right-1 text-[10px] ${
                isToday ? "text-emerald-600 font-semibold" : "text-slate-400"
              }`}
            >
              {day}
            </div>
            {isDue && (
              <div className="mt-5 flex flex-col gap-1">
                <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                  Water
                </Chip>
                {day === 20 && (
                  <Chip className="bg-amber-50 text-amber-700 ring-amber-200">
                    Fertilize
                  </Chip>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </Card>
);

// --- Propagations Kanban ---
const Column = ({ title, items }) => (
  <div className="min-w-[260px]">
    <div className="mb-2 text-xs font-semibold text-slate-500 tracking-wide">{title}</div>
    <div className="space-y-2">
      {items.map((i) => (
        <Card key={i.id}>
          <div className="text-sm font-medium text-slate-800">{i.name}</div>
          <div className="mt-1 text-xs text-slate-500">Started {i.started}</div>
          <div className="mt-2">
            <Chip className="bg-sky-50 text-sky-700 ring-sky-200">
              <Sprout className="h-3 w-3 mr-1" /> {i.stage}
            </Chip>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

const PropagationsBoard = () => (
  <div className="overflow-x-auto">
    <div className="flex gap-4">
      <Column title="Cuttings" items={propagations.cuttings} />
      <Column title="Planted" items={propagations.planted} />
      <Column title="Established" items={propagations.established} />
    </div>
  </div>
);

// --- Navigation ---
const NavTab = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition border ${
      active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const BottomNav = ({ active, setActive }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur sm:hidden">
    <div className="mx-auto max-w-7xl px-4">
      <div className="grid grid-cols-4 gap-2 py-2">
        <BottomNavItem icon={Home} label="Home" value="dash" active={active} setActive={setActive} />
        <BottomNavItem icon={Flower2} label="Plants" value="plants" active={active} setActive={setActive} />
        <BottomNavItem icon={CalendarDays} label="Calendar" value="cal" active={active} setActive={setActive} />
        <BottomNavItem icon={Sprout} label="Props" value="props" active={active} setActive={setActive} />
      </div>
    </div>
  </nav>
);

const BottomNavItem = ({ icon: Icon, label, value, active, setActive }) => {
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={`flex flex-col items-center justify-center rounded-xl px-2 py-1 text-xs ${
        isActive ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      <Icon className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
      <span className="mt-0.5">{label}</span>
    </button>
  );
};

const Shell = ({ children, activeTab, setActiveTab }) => (
  <div className="min-h-screen pb-16 sm:pb-0 bg-gradient-to-b from-emerald-50 to-white">
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-emerald-600" />
          <h1 className="font-semibold tracking-tight">Plant Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative">
              <input
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="Search plants, tags…"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <Button variant="ghost">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>
          <IconBtn label="Settings">
            <Settings className="h-5 w-5" />
          </IconBtn>
        </div>
      </header>

      {/* Desktop tabs */}
      <nav className="mt-6 hidden sm:flex flex-wrap gap-2">
        <NavTab icon={CheckCircle2} label="Dashboard" active={activeTab === "dash"} onClick={() => setActiveTab("dash")} />
        <NavTab icon={Flower2} label="Plants" active={activeTab === "plants"} onClick={() => setActiveTab("plants")} />
        <NavTab icon={CalendarDays} label="Calendar" active={activeTab === "cal"} onClick={() => setActiveTab("cal")} />
        <NavTab icon={Sprout} label="Propagations" active={activeTab === "props"} onClick={() => setActiveTab("props")} />
      </nav>

      <main className="mt-6">{children}</main>

      <footer className="mt-10 text-xs text-slate-500 flex items-center gap-2">
        <CloudOff className="h-3.5 w-3.5" /> Demo UI · Offline mock
      </footer>
    </div>
    {/* Mobile bottom nav */}
    <BottomNav active={activeTab} setActive={setActiveTab} />
  </div>
);

// --- Pages ---
const Dashboard = ({ plants }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2 space-y-4">
      <Card>
        <SectionHeader icon={CheckCircle2} title="Today" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasksTodayStatic.map((t) => {
            const p = plants.find((x) => x.id === t.plantId) || plants[0];
            return (
              <div key={t.id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                {t.type === "Water" && <Droplets className="h-5 w-5 text-emerald-600" />}
                {t.type === "Rotate" && <Sun className="h-5 w-5 text-amber-600" />}
                <div className="text-sm">
                  <div className="font-medium text-slate-800">
                    {t.type} – {p?.name}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {p?.location} • {t.when}
                  </div>
                </div>
                <div className="ml-auto">
                  <Button variant="ghost">Mark done</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <CalendarMock />
    </div>

    <div className="space-y-4">
      <Card>
        <SectionHeader icon={AlertTriangle} title="Due Soon" />
        <div className="mt-3 space-y-2">
          {plants
            .filter((p) => p.due.length > 0)
            .map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                <img src={p.img} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <div className="text-sm">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500 flex gap-1">
                    {p.due.map((d) => (
                      <span key={d}>{badgeFor(d)}</span>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-xs text-slate-500 text-right">
                  <div>Next water</div>
                  <div className="font-medium text-slate-700">{p.nextWater}</div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <SectionHeader icon={Recycle} title="Propagation Stats" />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">Cuttings</div>
            <div className="text-lg font-semibold text-slate-800">{propagations.cuttings.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">Planted</div>
            <div className="text-lg font-semibold text-slate-800">{propagations.planted.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">Established</div>
            <div className="text-lg font-semibold text-slate-800">{propagations.established.length}</div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

const AddPlantModal = ({ open, onClose, onCreate }) => {
  const [form, setForm] = useState({
    name: "",
    variety: "",
    location: "",
    moisture: 40,
    sun: "Bright Indirect",
    lastWatered: "2025-09-01",
    nextWater: "2025-09-08",
    nextFertilize: "2025-09-29",
    tags: "",
    img: "",
  });

  const canSave = form.name.trim().length > 1 && form.location.trim().length > 0;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const plant = {
      id: `p${Math.random().toString(36).slice(2, 7)}`,
      name: form.name.trim(),
      variety: form.variety.trim() || "",
      location: form.location.trim(),
      moisture: Number(form.moisture) || 0,
      sun: form.sun,
      lastWatered: form.lastWatered,
      nextWater: form.nextWater,
      nextFertilize: form.nextFertilize,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      due: [],
      img:
        form.img ||
        "https://images.unsplash.com/photo-1614594950633-95df4cfb27df?q=80&w=1200&auto=format&fit=crop",
    };
    onCreate(plant);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add Plant</h3>
              <IconBtn onClick={onClose} label="Close">
                <X className="h-5 w-5" />
              </IconBtn>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-slate-600 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="e.g., Monstera Deliciosa"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Variety</label>
                  <input
                    value={form.variety}
                    onChange={(e) => update("variety", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="e.g., Swiss Cheese"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Location *</label>
                  <input
                    required
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="e.g., Living Room"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Moisture (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.moisture}
                    onChange={(e) => update("moisture", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Sun</label>
                  <select
                    value={form.sun}
                    onChange={(e) => update("sun", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option>Bright</option>
                    <option>Bright Indirect</option>
                    <option>Medium</option>
                    <option>Low to Medium</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Last Watered</label>
                  <input
                    type="date"
                    value={form.lastWatered}
                    onChange={(e) => update("lastWatered", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Next Water</label>
                  <input
                    type="date"
                    value={form.nextWater}
                    onChange={(e) => update("nextWater", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Next Fertilize</label>
                  <input
                    type="date"
                    value={form.nextFertilize}
                    onChange={(e) => update("nextFertilize", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Tags (comma‑separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="e.g., tropical, trailing"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Image URL</label>
                <input
                  value={form.img}
                  onChange={(e) => update("img", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="https://…"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className={!canSave ? "opacity-60 pointer-events-none" : ""}>
                  <Plus className="h-4 w-4" /> Add Plant
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Plants = ({ plants, setPlants }) => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const onOpen = (plant) => {
    setSelected(plant);
    setOpenDrawer(true);
  };
  const onClose = () => setOpenDrawer(false);

  const onCreate = (plant) => setPlants((prev) => [plant, ...prev]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">{plants.length} plants</div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Plant
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plants.map((p) => (
          <PlantCard key={p.id} plant={p} onOpen={onOpen} />
        ))}
      </div>
      <Drawer open={openDrawer} onClose={onClose} plant={selected} />
      <AddPlantModal open={showAdd} onClose={() => setShowAdd(false)} onCreate={onCreate} />
    </>
  );
};

const CalendarPage = () => <CalendarMock />;
const PropsPage = () => <PropagationsBoard />;

export default function App() {
  const [active, setActive] = useState("dash");
  const [plants, setPlants] = useState(initialPlants);
  return (
    <Shell activeTab={active} setActiveTab={setActive}>
      {active === "dash" && <Dashboard plants={plants} />}
      {active === "plants" && <Plants plants={plants} setPlants={setPlants} />}
      {active === "cal" && <CalendarPage />}
      {active === "props" && <PropsPage />}
    </Shell>
  );
}

// --- Lightweight runtime sanity tests (logged to console) ---
(function runSanityTests() {
  const results: string[] = [] as any;
  try {
    if (formatMoisture(0) !== "0%") throw new Error("formatMoisture failed");
    results.push("formatMoisture ✓");
  } catch (e) {
    console.error("formatMoisture ✗", e);
  }
  try {
    const el = badgeFor("Water");
    if (!el || typeof el !== "object") throw new Error("badgeFor Water failed");
    results.push("badgeFor('Water') ✓");
  } catch (e) {
    console.error("badgeFor ✗", e);
  }
  try {
    if (!Array.isArray(initialPlants) || initialPlants.length < 1) throw new Error("initialPlants empty");
    results.push("initialPlants ✓");
  } catch (e) {
    console.error("initialPlants ✗", e);
  }
  // eslint-disable-next-line no-console
  console.log("[PlantTracker tests]", results.join(" | "));
})();
