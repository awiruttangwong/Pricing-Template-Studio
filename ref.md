import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "เรทราคาน้ำมัน | Transport Quotation System" },
      { name: "description", content: "ใบเสนอราคาเรทค่าขนส่งตามราคาน้ำมัน" },
    ],
  }),
  component: Index,
});

const BRAND = "#1B3A8E";
const BRAND_SOFT = "#E8EEF9";

/* ---------- Icons ---------- */
const TruckLogo = () => (
  <svg viewBox="0 0 96 96" className="h-20 w-20" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="22" width="44" height="34" rx="3" fill="#fff" stroke={BRAND} strokeWidth="3" />
    <rect x="36" y="28" width="14" height="12" fill={BRAND} />
    <rect x="54" y="28" width="14" height="12" fill={BRAND} />
    <path d="M30 44 H74" stroke={BRAND} strokeWidth="2" />
    <path d="M30 56 L20 56 L14 64 L14 72 L30 72 Z" fill="#fff" stroke={BRAND} strokeWidth="3" />
    <rect x="30" y="56" width="44" height="16" fill="#fff" stroke={BRAND} strokeWidth="3" />
    <circle cx="28" cy="74" r="6" fill={BRAND} />
    <circle cx="28" cy="74" r="2" fill="#fff" />
    <circle cx="62" cy="74" r="6" fill={BRAND} />
    <circle cx="62" cy="74" r="2" fill="#fff" />
    {/* speed lines */}
    <rect x="6" y="48" width="10" height="3" fill="#E11D48" />
    <rect x="4" y="54" width="14" height="3" fill="#F59E0B" />
    <rect x="6" y="60" width="10" height="3" fill="#3B82F6" />
  </svg>
);

const RouteIcon = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 6c0 2.5 4 5 4 5s4-2.5 4-5a4 4 0 1 0-8 0Z" stroke={BRAND} strokeWidth="2" />
    <circle cx="14" cy="6" r="1.4" fill={BRAND} />
    <path d="M14 12 C 8 16, 22 18, 16 24 C 10 28, 22 28, 22 28" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" fill="none" />
    <circle cx="22" cy="28" r="2" fill={BRAND} />
  </svg>
);

const RoadIcon = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4 L13 4 L11 28 L4 28 Z" fill={BRAND} />
    <path d="M24 4 L19 4 L21 28 L28 28 Z" fill={BRAND} />
    <rect x="15" y="6" width="2" height="4" fill={BRAND} />
    <rect x="15" y="14" width="2" height="4" fill={BRAND} />
    <rect x="15" y="22" width="2" height="4" fill={BRAND} />
  </svg>
);

const TruckSmall = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="10" width="16" height="12" fill={BRAND} />
    <path d="M19 14 L25 14 L29 18 L29 22 L19 22 Z" fill={BRAND} />
    <circle cx="9" cy="24" r="2.5" fill="#fff" stroke={BRAND} strokeWidth="1.5" />
    <circle cx="23" cy="24" r="2.5" fill="#fff" stroke={BRAND} strokeWidth="1.5" />
  </svg>
);

const FuelIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M4 21h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 8h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M15 9l3 2v7a2 2 0 0 0 2 2v-9l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" fill={BRAND} />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" fill={BRAND} />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="16" rx="2" fill={BRAND} />
    <rect x="3" y="5" width="18" height="5" fill={BRAND} />
    <rect x="7" y="2" width="2" height="5" rx="1" fill={BRAND} />
    <rect x="15" y="2" width="2" height="5" rx="1" fill={BRAND} />
    <rect x="6" y="12" width="3" height="3" fill="#fff" />
    <rect x="11" y="12" width="3" height="3" fill="#fff" />
    <rect x="16" y="12" width="3" height="3" fill="#fff" />
    <rect x="6" y="17" width="3" height="2" fill="#fff" />
    <rect x="11" y="17" width="3" height="2" fill="#fff" />
  </svg>
);

const DocIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" fill={BRAND} />
    <path d="M15 2v5h5" fill="#fff" opacity=".4" />
    <rect x="8" y="12" width="9" height="1.5" fill="#fff" />
    <rect x="8" y="15" width="9" height="1.5" fill="#fff" />
    <rect x="8" y="18" width="6" height="1.5" fill="#fff" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3Z" fill={BRAND} />
    <path d="m8 12 3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- Data ---------- */
const priceRanges = ["40.01 - 41.00", "41.01 - 42.00", "42.01 - 43.00", "43.01 - 44.00"];
const rows = [
  { route: "PTE_D-UDN", km: "544", vehicle: "6W7.5", prices: ["9,481", "9,649", "9,817", "9,984"] },
];

/* ---------- Page ---------- */
function Index() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10" style={{ color: BRAND }}>
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        {/* Top header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <TruckLogo />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">เรทราคาน้ำมัน</h1>
              <p className="mt-1 text-sm opacity-70">อัตราค่าขนส่ง | เสนอต่อผู้ว่าจ้าง</p>
            </div>
          </div>

          <div className="space-y-3 md:text-right">
            <div className="flex items-start gap-3 md:justify-end">
              <UserIcon />
              <div>
                <div className="text-xs opacity-70">Pricing Profile</div>
                <div className="text-sm font-semibold">
                  Driver 87% <span className="opacity-50">|</span> Company 13%
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 md:justify-end">
              <CalendarIcon />
              <div>
                <div className="text-xs opacity-70">Reference Date</div>
                <div className="text-sm font-semibold">01 มิถุนายน 2567</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 p-4">
          {[
            { icon: <RouteIcon />, label: "ชื่อเส้นทาง (ROUTE)", value: "PTE_D-UDN" },
            { icon: <RoadIcon />, label: "ระยะทาง (Km)", value: "544 Km" },
            { icon: <TruckSmall />, label: "ประเภทรถ (VEHICLE TYPE)", value: "6W7.5" },
          ].map((it, i) => (
            <div key={i} className="flex items-center gap-4 px-2">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: BRAND_SOFT }}
              >
                {it.icon}
              </div>
              <div>
                <div className="text-xs opacity-70">{it.label}</div>
                <div className="text-xl font-bold">{it.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          {/* Header */}
          <div className="grid grid-cols-[1.1fr_0.7fr_0.9fr_3.6fr] text-white" style={{ backgroundColor: BRAND }}>
            <div className="flex flex-col items-center justify-center px-3 py-4 border-r border-white/15 text-center">
              <div className="text-sm font-semibold">ชื่อเส้นทาง</div>
              <div className="text-xs opacity-90">(ROUTE)</div>
            </div>
            <div className="flex flex-col items-center justify-center px-3 py-4 border-r border-white/15 text-center">
              <div className="text-sm font-semibold">ระยะทาง</div>
              <div className="text-xs opacity-90">(Km)</div>
            </div>
            <div className="flex flex-col items-center justify-center px-3 py-4 border-r border-white/15 text-center">
              <div className="text-sm font-semibold">ประเภทรถ</div>
              <div className="text-xs opacity-90">(VEHICLE TYPE)</div>
            </div>
            <div className="flex flex-col">
              <div className="border-b border-white/15 py-2 text-center text-sm font-semibold">
                เรทราคาน้ำมัน (บาท/ลิตร)
              </div>
              <div className="grid grid-cols-4 flex-1">
                {priceRanges.map((r, i) => (
                  <div
                    key={r}
                    className={`flex items-center justify-center gap-2 px-2 py-2 ${
                      i < priceRanges.length - 1 ? "border-r border-white/15" : ""
                    }`}
                  >
                    <FuelIcon className="h-5 w-5 text-white" />
                    <div className="text-center leading-tight">
                      <div className="text-sm font-semibold">{r}</div>
                      <div className="text-[11px] opacity-90">บาท/ลิตร</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1.1fr_0.7fr_0.9fr_3.6fr] bg-white"
              style={{ color: BRAND }}
            >
              <div className="flex items-center justify-center px-3 py-10 text-lg font-medium border-r border-slate-200">
                {row.route}
              </div>
              <div className="flex items-center justify-center px-3 py-10 text-lg font-medium border-r border-slate-200">
                {row.km}
              </div>
              <div className="flex items-center justify-center px-3 py-10 text-lg font-medium border-r border-slate-200">
                {row.vehicle}
              </div>
              <div className="grid grid-cols-4">
                {row.prices.map((p, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center px-2 py-10 ${
                      i < row.prices.length - 1 ? "border-r border-slate-200" : ""
                    }`}
                  >
                    <div className="text-3xl font-bold">{p}</div>
                    <div className="mt-1 text-sm opacity-80">บาท</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-slate-200 pt-5">
          <div className="flex items-center gap-2 text-sm">
            <DocIcon />
            <span className="opacity-80">Quotation Version : </span>
            <span className="font-semibold">V1.0</span>
          </div>
          <div className="flex items-center gap-2 text-sm md:text-right">
            <ShieldIcon />
            <div className="leading-tight">
              <div className="font-semibold">จัดทำโดย ระบบบริหารอัตราค่าขนส่ง</div>
              <div className="opacity-80">Transport Quotation System</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}