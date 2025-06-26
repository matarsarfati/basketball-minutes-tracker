import { render, screen } from '@testing-library/react';
import App from './App';

test('renders basketball minutes tracker', () => {
  render(<App />);
  const titleElement = screen.getByText(/Basketball Minutes Tracker/i);
  expect(titleElement).toBeInTheDocument();
});