import React from "react";

export interface Props {
  id?: string;
  value: number;
  onChange: (network: number) => void;
  options: { [k: number]: React.ReactNode };
}

export function NetworkSelector(props: Props) {
  return (
    <select
      id={props.id}
      onChange={(e) => props.onChange(parseInt(e.target.value, 10))}
      value={props.value}
    >
      {Object.entries(props.options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
