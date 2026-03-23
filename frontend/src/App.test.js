import { render, screen } from '@testing-library/react';
import App from './App';
import apiClient from './api/axiosConfig';

jest.mock('./api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { response: { use: jest.fn() } }
  }
}));

test('renders prepify app shell', async () => {
  apiClient.get.mockImplementation((url) => {
    if (url === '/api/account') {
      return Promise.resolve({ data: { username: 'u', email: 'u@test.com' } });
    }
    if (url === '/api/folders') {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });

  render(<App />);
  expect(await screen.findByText('Dashboard')).toBeInTheDocument();
});
