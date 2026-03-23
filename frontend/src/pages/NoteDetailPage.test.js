import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NoteDetailPage from './NoteDetailPage';
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

describe('NoteDetailPage quiz attempt flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    apiClient.get.mockImplementation((url) => {
      if (url === '/api/notes/1') {
        return Promise.resolve({
          data: {
            id: 1,
            filename: 'Math Note',
            original_content: 'summary',
            date_posted: '2026-03-23T10:00:00Z',
            folder_id: null,
            flashcard_sets: [],
            quiz_sets: [
              {
                id: 10,
                title: 'Quiz A',
                date_posted: '2026-03-23T10:00:00Z',
                content: [
                  { question: 'Capital of France?', options: ['Paris', 'Rome', 'Madrid', 'Berlin'], answer: 'Paris' },
                  { question: '2 + 2 = ?', options: ['1', '2', '3', '4'], answer: '4' }
                ]
              }
            ]
          }
        });
      }

      if (url === '/api/quiz_sets/10/attempts?page=1&limit=10') {
        return Promise.resolve({ data: { items: [], page: 1, limit: 10, total: 0, pages: 0 } });
      }

      return Promise.resolve({ data: {} });
    });

    apiClient.post.mockImplementation((url, body) => {
      if (url === '/api/quiz_sets/10/attempts') {
        return Promise.resolve({
          data: {
            id: 501,
            score: 2,
            total_questions: 2,
            answers: body.answers,
            date_attempted: '2026-03-23T12:00:00Z'
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    window.alert = jest.fn();
  });

  test('submits answers and saves an attempt', async () => {
    render(
      <MemoryRouter
        initialEntries={['/notes/1']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ currentUser: { username: 'u', email: 'u@test.com' } }}>
          <Routes>
            <Route path="/notes/:noteId" element={<NoteDetailPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const quizTab = await screen.findByRole('button', { name: /Quiz/i });
    fireEvent.click(quizTab);

    const parisOption = await screen.findByText('Paris');
    fireEvent.click(parisOption);
    const fourOption = await screen.findByText('4');
    fireEvent.click(fourOption);

    const saveButton = await screen.findByRole('button', { name: 'Save Attempt' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/quiz_sets/10/attempts', {
        answers: { 0: 'Paris', 1: '4' }
      });
    });

    expect(await screen.findByText('Attempt History')).toBeInTheDocument();
  });
});
