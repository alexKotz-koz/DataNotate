import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Dataset {
  _id: string;
  title: string;
  description?: string;
  uploadType: 'csv' | 'json';
  columns: string[];
  _createdBy?: string | null;
  _dateCreated?: string;
}

export interface DatasetRow {
  _id: string;
  dataset: string;
  data: Record<string, unknown>;
  rowId?: string | null;
}

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Dataset', 'DatasetRows'],
  endpoints: (builder) => ({
    
    uploadDataset: builder.mutation<{ success: boolean; datasetId: string }, FormData>({
      invalidatesTags: ['Dataset'],
      query: (formData) => ({
        url: '/dataset/upload',
        method: 'POST',
        body: formData,
      }),
    }),
    // Note the <Dataset[], void> — now no arg is required
    fetchDatasets: builder.query<Dataset[], void>({
      providesTags: ['Dataset'],
      query: () => ({
        url: '/dataset/fetch-all',
        method: 'GET',
      }),
    }),
    fetchDatasetRows: builder.query<DatasetRow[], string>({
      providesTags: (result, error, id) => [{ type: 'DatasetRows', id }],
      query: (datasetId) => ({
        url: `/dataset/${datasetId}/rows`,
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useUploadDatasetMutation,
  useFetchDatasetsQuery,
  useFetchDatasetRowsQuery,
} = datasetApi;