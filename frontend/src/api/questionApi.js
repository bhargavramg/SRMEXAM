import axiosClient from './axiosClient';

const questionApi = {
  getAll: (params) => axiosClient.get('/questions', { params }),
  getById: (id) => axiosClient.get(`/questions/${id}`),
  create: (data) => axiosClient.post('/questions', data),
  update: (id, data) => axiosClient.put(`/questions/${id}`, data),
  delete: (id) => axiosClient.delete(`/questions/${id}`),
};

export default questionApi;
