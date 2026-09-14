"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const statusColor: Record<string, string> = {
  APPROVED: "#839958",
  IN_REVIEW: "#105666",
  ESCALATED: "#D3968C",
  DENIED: "#A85647",
  SUBMITTED: "#4C8B99",
  ANALYZING: "#276E7F",
  NEEDS_EVIDENCE: "#C17667",
};

const statusLabel: Record<string, string> = {
  APPROVED: "Approved",
  IN_REVIEW: "In review",
  ESCALATED: "Escalated",
  DENIED: "Denied",
  SUBMITTED: "Submitted",
  ANALYZING: "Analyzing",
  NEEDS_EVIDENCE: "Needs evidence",
};

export function ReportCharts({
  byStatus,
  byType,
}: {
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
}) {
  const pieData = byStatus.map((s) => ({ name: statusLabel[s.status] ?? s.status, value: s.count, color: statusColor[s.status] ?? "#0A3323" }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
        <h2 className="font-display text-lg text-pond-500">Outcomes</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-pond-100 bg-clarity-100 p-6">
        <h2 className="font-display text-lg text-pond-500">Claims by type</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType.map((t) => ({ type: t.type, claims: t.count }))} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0A332310" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#0A332370" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#0A332370" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="claims" fill="#105666" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
