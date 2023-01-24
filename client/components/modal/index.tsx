import React, { useState, useEffect } from 'react';

export interface Props {
  size?: 'tiny' | 'small' | 'medium' | 'large';
  isVisible?: boolean;
  header?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => any;
}

export function Modal(props: Props) {
  const onClose = props.onClose ? props.onClose : () => {};

  return (
    <div
      className={`modal ${props.isVisible ? '' : 'hidden'} ${props.size ?? 'large'}`}
      onClick={(e) => (e.currentTarget === e.target ? onClose() : null)}
    >
      <div>
        <header className="row">
          <div className="column column-90">{props.header}</div>
          <div className="column column-10" onClick={onClose}>
            &times;
          </div>
        </header>
        <section>{props.children}</section>
      </div>
    </div>
  );
}
