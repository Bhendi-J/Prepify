import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from './AccountPage';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';

jest.mock('../api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { response: { use: jest.fn() } }
  }
}));

describe('AccountPage refresh behavior', () => {
  test('refreshes analytics after goal generation without full-page reload', async () => {
    let goalCreated = false;

    apiClient.get.mockImplementation((url) => {
      if (url === '/api/analytics') {
        return Promise.resolve({
          data: {
            stats: { streak: 1, this_week: 1, this_month: 1, total_activities: 1, total_folders: 1, total_notes: 1 },
            breakdown: { upload: 1, flashcard: 0, quiz: 0, todo: 0 },
            most_active: {},
            weekly_trend: [{ week: '2026-03-23', count: 1 }],
            last_7_days: [{ day: 'Mon', count: 1 }],
            heatmap: {}
          }
        });
      }

      if (url === '/api/goals') {
        return Promise.resolve({
          data: goalCreated ? { id: 1, description: 'Study physics', progress: 0 } : null
        });
      }

      if (url === '/api/todos') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/api/notes?minimal=1') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/api/daily_summary') {
        return Promise.resolve({ data: { summary: 'Great job.' } });
      }

      return Promise.resolve({ data: {} });
    });

    apiClient.post.mockImplementation((url) => {
      if (url === '/api/goals') {
        goalCreated = true;
      }
      return Promise.resolve({ data: { message: 'ok' } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ currentUser: { username: 'u', email: 'u@test.com' }, logout: jest.fn() }}>
          <AccountPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const textarea = await screen.findByPlaceholderText(/I want to read my biology notes/i);
    fireEvent.change(textarea, { target: { value: 'I will revise chemistry and solve quizzes.' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Daily Plan/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/goals', {
        paragraph: 'I will revise chemistry and solve quizzes.'
      });
    });

    await waitFor(() => {
      const analyticsCalls = apiClient.get.mock.calls.filter(([url]) => url === '/api/analytics').length;
      expect(analyticsCalls).toBeGreaterThanOrEqual(2);
    });
  });
});
