import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from '../App';

describe('App root smoke test', () => {
  it('mounts without crashing when rendered at "/"', () => {
    // If the component tree throws, render() will throw and the test fails.
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
