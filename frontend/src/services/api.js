const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const BASE_URL = `${API_URL}/api`;

const getToken = () => localStorage.getItem('token');

export const api = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};
/**
 * Upload a bill image or PDF — uses multipart/form-data (no JSON).
 * Returns { url, type, ocr }
 */
export const uploadBill = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('bill', file);

  const res = await fetch(`${BASE_URL}/upload/bill`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      // Do NOT set Content-Type — browser sets it automatically with boundary
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Upload error response:', res.status, data);
    throw new Error(data.message || 'Upload failed');
  }
  return data;
};
