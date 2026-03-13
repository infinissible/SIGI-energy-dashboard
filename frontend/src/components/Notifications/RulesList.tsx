import React, { useState } from "react";
import { createPortal } from "react-dom";
import type { Rule, GroupedRules } from "./types";

type Props = {
  grouped: GroupedRules;
  onDeleteAt: (index: number) => void;
  onDeleteAll: () => void;
  findMetricLabel: (key: string) => string;
};

/* --- Tiny centered modal --- */
function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-5 w-[90%] max-w-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded border border-gray-300"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({
  title,
  items,
  onDeleteAt,
  findMetricLabel,
  prefix,
}: {
  title: string;
  items: { rule: Rule; idx: number }[];
  onDeleteAt: (index: number) => void;
  findMetricLabel: (key: string) => string;
  prefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 mt-2 mb-1">
        {title}
      </div>
      <ul className="text-sm space-y-2">
        {items.map(({ rule, idx }, i) => (
          <li
            key={`${prefix}-${i}`}
            className="flex justify-between items-center"
          >
            <span>
              <strong>{findMetricLabel(rule.metric)}</strong>:{" "}
              {rule.type === "null" ? (
                <>
                  <em>No Data (null)</em>
                  {typeof rule.repeatMins === "number" && (
                    <span className="text-xs text-gray-500">
                      {" "}
                      · every {rule.repeatMins}m
                    </span>
                  )}
                </>
              ) : (
                <>
                  Outside{" "}
                  <em>
                    [{rule.min}..{rule.max}]
                  </em>
                  {typeof rule.repeatMins === "number" && (
                    <span className="text-xs text-gray-500">
                      {" "}
                      · every {rule.repeatMins}m
                    </span>
                  )}
                </>
              )}
            </span>
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => onDeleteAt(idx)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function RulesList({
  grouped,
  onDeleteAt,
  onDeleteAll,
  findMetricLabel,
}: Props) {
  const totalCount =
    grouped.all.length +
    grouped.inverter.length +
    grouped.building.length +
    grouped.weather.length;

  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="bg-white border p-4 rounded shadow space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-medium text-gray-700">Current Rules</h2>
        {totalCount > 0 && (
          <button
            className="text-xs text-red-600 hover:underline"
            onClick={() => setConfirmOpen(true)}
          >
            Delete All Rules
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-gray-500">No rules defined.</p>
      ) : (
        <>
          <Section
            title="--- All Metrics ---"
            items={grouped.all}
            onDeleteAt={onDeleteAt}
            findMetricLabel={findMetricLabel}
            prefix="all"
          />
          <Section
            title="--- Inverter ---"
            items={grouped.inverter}
            onDeleteAt={onDeleteAt}
            findMetricLabel={findMetricLabel}
            prefix="inv"
          />
          <Section
            title="--- Building ---"
            items={grouped.building}
            onDeleteAt={onDeleteAt}
            findMetricLabel={findMetricLabel}
            prefix="bld"
          />
          <Section
            title="--- Weather Station ---"
            items={grouped.weather}
            onDeleteAt={onDeleteAt}
            findMetricLabel={findMetricLabel}
            prefix="wth"
          />
        </>
      )}

      {/* Confirm modal */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete all rules?"
        description="This will remove every notification rule."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDeleteAll();
        }}
      />
    </div>
  );
}
