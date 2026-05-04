import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SelectionProvider, useSelection } from './SelectionContext';
import type { ReactNode } from 'react';

function makeWrapper(maxSize?: number) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SelectionProvider maxSize={maxSize}>{children}</SelectionProvider>;
  };
}

describe('SelectionContext', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: makeWrapper() });
    expect(result.current.size).toBe(0);
    expect(result.current.isAtMaxSize).toBe(false);
  });

  it('toggles selection on/off', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: makeWrapper() });
    act(() => result.current.toggle(42));
    expect(result.current.isSelected(42)).toBe(true);
    expect(result.current.size).toBe(1);
    act(() => result.current.toggle(42));
    expect(result.current.isSelected(42)).toBe(false);
    expect(result.current.size).toBe(0);
  });

  it('enforces max size on toggle/select/selectMany', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: makeWrapper(3) });
    act(() => result.current.selectMany([1, 2, 3, 4, 5]));
    expect(result.current.size).toBe(3);
    expect(result.current.isAtMaxSize).toBe(true);
    expect(result.current.isSelected(4)).toBe(false);
    expect(result.current.isSelected(5)).toBe(false);

    act(() => result.current.toggle(99));
    expect(result.current.isSelected(99)).toBe(false);
    expect(result.current.size).toBe(3);

    act(() => result.current.select(100));
    expect(result.current.isSelected(100)).toBe(false);
  });

  it('clear() empties selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: makeWrapper() });
    act(() => result.current.selectMany([1, 2, 3]));
    expect(result.current.size).toBe(3);
    act(() => result.current.clear());
    expect(result.current.size).toBe(0);
  });

  it('unselectMany removes the given ids', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: makeWrapper() });
    act(() => result.current.selectMany([1, 2, 3, 4]));
    act(() => result.current.unselectMany([2, 4]));
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(false);
    expect(result.current.isSelected(3)).toBe(true);
    expect(result.current.isSelected(4)).toBe(false);
  });

  it('throws when used outside provider', () => {
    const spy = console.error;
    console.error = () => {}; // silence React error boundary
    expect(() => renderHook(() => useSelection())).toThrow(/SelectionProvider/);
    console.error = spy;
  });
});
