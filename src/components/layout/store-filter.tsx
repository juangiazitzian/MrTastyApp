"use client";

import React from "react";
import { Select } from "@/components/ui/select";

interface StoreFilterProps {
  stores: { id: string; name: string }[];
  value: string;
  onChange: (storeId: string) => void;
  includeAll?: boolean;
}

export function StoreFilter({ stores, value, onChange, includeAll = true }: StoreFilterProps) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {includeAll && <option value="all">Todos los locales</option>}
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </Select>
  );
}
