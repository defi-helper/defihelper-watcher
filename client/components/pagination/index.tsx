import React, { useState, useEffect, useReducer } from "react";

export interface Props {
  count: number;
  limit: number;
  page: number;
  onPrev: (page: number) => any;
  onNext: (page: number) => any;
}

export function Pagination({ count, limit, page, onPrev, onNext }: Props) {
  if (count <= limit) return null;

  return (
    <div>
      {page <= 1 || (
        <a href="#" onClick={() => onPrev(page - 1)}>
          {"<< "}
        </a>
      )}
      {page} of {Math.ceil(count / limit)}
      {page * limit >= count || (
        <a href="#" onClick={() => onNext(page + 1)}>
          {" >>"}
        </a>
      )}
    </div>
  );
}
