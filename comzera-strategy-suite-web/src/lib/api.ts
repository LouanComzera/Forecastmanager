const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const API_URL = {
  COMPANIES: `${API_BASE_URL}/companies`,
  EXPENSES: `${API_BASE_URL}/expenses`,
  SUMMARY: `${API_BASE_URL}/expenses/summary`,
};
