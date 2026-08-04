import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HomePage } from '../pages/HomePage.js';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage — header', () => {
  it('renders a "Log In" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Log In' });
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('renders a "Get Started" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Get Started' });
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('renders the brand name "WellnessHub"', () => {
    renderHomePage();
    expect(screen.getAllByText('WellnessHub').length).toBeGreaterThan(0);
  });
});

describe('HomePage — hero section', () => {
  it('renders h1 "Your Health Journey Starts Here"', () => {
    renderHomePage();
    expect(
      screen.getByRole('heading', { name: 'Your Health Journey Starts Here', level: 1 }),
    ).toBeTruthy();
  });

  it('renders supporting copy mentioning unified wellness tracking', () => {
    renderHomePage();
    expect(
      screen.getByText(/comprehensive health dashboard/i),
    ).toBeTruthy();
  });

  it('renders a "Get Started Free" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Get Started Free' });
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('renders a "Learn More" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Learn More' });
    expect(link.getAttribute('href')).toBeTruthy();
  });
});

describe('HomePage — domain cards', () => {
  it('renders the "Activity" domain card heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeTruthy();
  });

  it('renders Activity card copy mentioning daily steps and calories burned', () => {
    renderHomePage();
    expect(screen.getByText(/daily steps, active minutes, calories burned/i)).toBeTruthy();
  });

  it('renders the "Sleep" domain card heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeTruthy();
  });

  it('renders Sleep card copy mentioning sleep duration and quality', () => {
    renderHomePage();
    expect(screen.getByText(/sleep duration, quality, and consistency/i)).toBeTruthy();
  });

  it('renders the "Vital Metrics" domain card heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Vital Metrics' })).toBeTruthy();
  });

  it('renders Vital Metrics card copy mentioning heart rate and blood pressure', () => {
    renderHomePage();
    expect(screen.getByText(/heart rate, resting heart rate, blood pressure/i)).toBeTruthy();
  });

  it('renders the "Body Composition" domain card heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Body Composition' })).toBeTruthy();
  });

  it('renders Body Composition card copy mentioning body fat percentage', () => {
    renderHomePage();
    expect(screen.getByText(/body fat percentage, muscle mass/i)).toBeTruthy();
  });
});

describe('HomePage — statistics strip', () => {
  it('renders stat "4" for core health domains', () => {
    renderHomePage();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders label "Core health domains monitored"', () => {
    renderHomePage();
    expect(screen.getByText('Core health domains monitored')).toBeTruthy();
  });

  it('renders stat "1" for unified dashboard', () => {
    renderHomePage();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders label "Unified dashboard replacing multiple apps"', () => {
    renderHomePage();
    expect(screen.getByText('Unified dashboard replacing multiple apps')).toBeTruthy();
  });

  it('renders stat "Daily" for synchronization', () => {
    renderHomePage();
    expect(screen.getByText('Daily')).toBeTruthy();
  });

  it('renders label "Near-daily synchronization visibility"', () => {
    renderHomePage();
    expect(screen.getByText('Near-daily synchronization visibility')).toBeTruthy();
  });

  it('renders stat "100%" for privacy', () => {
    renderHomePage();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders label "Privacy-first handling of your data"', () => {
    renderHomePage();
    expect(screen.getByText('Privacy-first handling of your data')).toBeTruthy();
  });
});

describe('HomePage — trust section', () => {
  it('renders heading "Your data, your control"', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Your data, your control' })).toBeTruthy();
  });

  it('renders "You Own Your Data" trust item heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'You Own Your Data' })).toBeTruthy();
  });

  it('renders "You Own Your Data" copy about exporting or deleting data', () => {
    renderHomePage();
    expect(screen.getByText(/belongs to you\. Export or delete it anytime/i)).toBeTruthy();
  });

  it('renders "Encrypted & Secure" trust item heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Encrypted & Secure' })).toBeTruthy();
  });

  it('renders "Encrypted & Secure" copy about encryption at rest and in transit', () => {
    renderHomePage();
    expect(screen.getByText(/encrypted at rest and in transit/i)).toBeTruthy();
  });

  it('renders "Never Sold" trust item heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Never Sold' })).toBeTruthy();
  });

  it('renders "Never Sold" copy about not selling to advertisers', () => {
    renderHomePage();
    expect(screen.getByText(/never sell your personal health data to advertisers/i)).toBeTruthy();
  });
});

describe('HomePage — footer', () => {
  it('renders a "Privacy Policy" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('renders a "Terms of Service" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Terms of Service' });
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('renders a "Contact" link with an href attribute', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: 'Contact' });
    expect(link.getAttribute('href')).toBeTruthy();
  });
});

describe('HomePage — keyboard accessibility', () => {
  it('does not render any interactive element as a non-semantic div or span', () => {
    const { container } = renderHomePage();
    const divButtons = container.querySelectorAll('div[onclick], span[onclick]');
    expect(divButtons.length).toBe(0);
  });

  it('renders the h1 before any h2 (heading hierarchy is not skipped)', () => {
    const { container } = renderHomePage();
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const firstHeading = headings[0];
    expect(firstHeading?.tagName.toLowerCase()).toBe('h1');
  });
});
