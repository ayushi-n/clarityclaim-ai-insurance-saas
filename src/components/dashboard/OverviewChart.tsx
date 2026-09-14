"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const data = [
  { day: "Aug 13", approved: 6, escalated: 1 },
  { day: "Aug 14", approved: 8, escalated: 2 },
  { day: "Aug 15", approved: 5, escalated: 1 },
  { day: "Aug 16", approved: 9, escalated: 0 },
  { day: "Aug 17", approved: 7, escalated: 3 },
  { day: "Aug 18", approved: 10, escalated: 1 },
  { day: "Aug 19", approved: 12, escalated: 2 },
  { day: "Aug 20", approved: 9, escalated: 1 },
  { day: "Aug 21", approved: 11, escalated: 0 },
  { day: "Aug 22", approved: 8, escalated: 2 },
  { day: "Aug 23", approved: 13, escalated: 1 },
  { day: "Aug 24", approved: 10, escalated: 3 },
  { day: "Aug 25", approved: 14, escalated: 1 },
  { day: "Aug 26", approved: 12, escalated: 2 },
];

export function OverviewChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="approvedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#839958" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#839958" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="escalatedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D3968C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#D3968C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0A332310" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#0A332370" }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11, fill: "#0A332370" }} axisLine={false} tickLine={false} width={24} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #0A332315",
              fontSize: 12,
              boxShadow: "0 8px 30px -8px rgba(10,51,35,0.18)",
            }}
          />
          <Area type="monotone" dataKey="approved" stroke="#839958" strokeWidth={2} fill="url(#approvedFill)" name="Approved" />
          <Area type="monotone" dataKey="escalated" stroke="#D3968C" strokeWidth={2} fill="url(#escalatedFill)" name="Escalated" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
