import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Dataset {
  _id: string;
  title: string;
  description?: string;
  uploadType: 'csv' | 'json';
  columns: string[];
  _createdBy?: string | null;
  _dateCreated?: string;
  rowCount?: number; // added for gallery display
}

export interface DatasetRow {
  _id: string;
  dataset: string;
  data: Record<string, unknown>;
  rowId?: string | null;
}

export interface RubricField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required?: boolean;
  instructions?: string;
  options?: string[];
  isDatasetColumn?: boolean;
}

export interface Rubric {
  _id: string;
  title: string;
  dataset: string;
  displayColumns: string[];
  fields: RubricField[];
  _createdBy?: string | null;
  _dateCreated?: string;
  _dateUpdated?: string;
}

export interface Annotation {
  _id: string;
  dataset: string;
  rubric: string | { _id: string; title: string };
  rows: Array<{ datasetRow: string | { _id: string; data: Record<string, unknown> }; values: Record<string, any>; _dateAnnotated?: string }>;
  completed?: boolean;
  targetRowCount?: number;
  _annotator?:
    | string
    | {
        _id: string;
        username: string;
        firstName?: string;
        lastName?: string;
        role?: string;
      }
    | null;
  sessionLabel?: string;
  sessionNumber?: number;
  _dateCreated?: string;
  _dateUpdated?: string;
}

export interface AnnotationStats {
  // Common
  totalRows: number;
  rubricCount?: number; // dataset-level only
  // Dataset-level aggregate annotation stats
  annotationRecordCount?: number;
  completedRecordCount?: number;
  // Per-rubric aggregate stats
  annotationRecords?: number;
  completedRecords?: number;
  averageRowsAnnotated?: number;
  percentCompletionAverage?: number;
}

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Dataset', 'DatasetRows', 'Rubric', 'Annotation'],
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
      providesTags: (_result, _error, id) => [{ type: 'DatasetRows', id }],
      query: (datasetId) => ({
        url: `/dataset/${datasetId}/rows`,
        method: 'GET',
      }),
    }),
    deleteDataset: builder.mutation<{ success: boolean; message: string }, string>({
      invalidatesTags: ['Dataset'],
      query: (datasetId) => ({
        url: `/dataset/${datasetId}`,
        method: 'DELETE',
      }),
    }),
    
    // Rubric endpoints
    getRubricsByDataset: builder.query<Rubric[], string>({
      providesTags: (_result, _error, datasetId) => [{ type: 'Rubric', id: datasetId }],
      query: (datasetId) => ({ url: `/rubric/by-dataset/${datasetId}`, method: 'GET' }),
    }),
    getRubricById: builder.query<Rubric, string>({
      providesTags: (_result, _error, rubricId) => [{ type: 'Rubric', id: rubricId }],
      query: (rubricId) => ({ url: `/rubric/${rubricId}`, method: 'GET' }),
    }),
    createRubric: builder.mutation<
      { success: boolean; rubric: Rubric }, 
      { title: string; datasetId: string; displayColumns: string[]; fields: RubricField[] }
    >({
      invalidatesTags: (_result, _error, arg) => [{ type: 'Rubric', id: arg.datasetId }],
      query: (body) => ({ url: '/rubric/create', method: 'POST', body }),
    }),
    updateRubric: builder.mutation<
      { success: boolean; rubric: Rubric }, 
      { rubricId: string; title?: string; displayColumns?: string[]; fields?: RubricField[] }
    >({
      invalidatesTags: (_result, _error, arg) => [{ type: 'Rubric', id: arg.rubricId }],
      query: ({ rubricId, ...body }) => ({ url: `/rubric/${rubricId}`, method: 'PUT', body }),
    }),
    deleteRubric: builder.mutation<{ success: boolean; message: string }, string>({
      invalidatesTags: ['Rubric', 'Annotation'],
      query: (rubricId) => ({ url: `/rubric/${rubricId}`, method: 'DELETE' }),
    }),
    
    // Annotation endpoints
    fetchAnnotationsByDataset: builder.query<Annotation[], { datasetId: string; rubricId?: string; mine?: boolean; annotatorId?: string; annotationId?: string }>({
      providesTags: (_result, _error, { datasetId, rubricId }) => [
        { type: 'Annotation', id: rubricId || datasetId }
      ],
      query: ({ datasetId, rubricId, mine, annotatorId, annotationId }) => {
        const params = new URLSearchParams();
        if (rubricId) params.set('rubricId', rubricId);
        if (mine) params.set('mine', 'true');
        if (annotatorId) params.set('annotatorId', annotatorId);
        if (annotationId) params.set('annotationId', annotationId);
        const queryString = params.toString();
        return { 
          url: `/annotation/by-dataset/${datasetId}${queryString ? `?${queryString}` : ''}`, 
          method: 'GET' 
        };
      },
    }),
    saveAnnotation: builder.mutation<
      { success: boolean; annotation: Annotation },
      { datasetId: string; rubricId: string; datasetRowId: string; annotations: Record<string, any>; annotationId?: string }
    >({
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Annotation', id: arg.datasetId },
        { type: 'Annotation', id: arg.rubricId },
        { type: 'Annotation', id: arg.datasetRowId }
      ],
      query: (body) => ({ url: '/annotation/save', method: 'POST', body }),
    }),
    createAnnotationSession: builder.mutation<
      { success: boolean; annotation: Annotation },
      { datasetId: string; rubricId: string; sessionLabel?: string }
    >({
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Annotation', id: arg.datasetId },
        { type: 'Annotation', id: arg.rubricId }
      ],
      query: (body) => ({ url: '/annotation/session', method: 'POST', body })
    }),
    deleteAnnotation: builder.mutation<{ success: boolean }, string>({
      invalidatesTags: ['Annotation'],
      query: (annotationId) => ({ url: `/annotation/${annotationId}`, method: 'DELETE' }),
    }),
    fetchAnnotationStats: builder.query<AnnotationStats, { datasetId: string; rubricId?: string }>({
      providesTags: (_result, _error, { datasetId, rubricId }) => [
        { type: 'Annotation', id: rubricId || datasetId }
      ],
      query: ({ datasetId, rubricId }) => ({ 
        url: `/annotation/stats/${datasetId}${rubricId ? `?rubricId=${rubricId}` : ''}`, 
        method: 'GET' 
      }),
    }),
  }),
});

export const {
  useUploadDatasetMutation,
  useFetchDatasetsQuery,
  useFetchDatasetRowsQuery,
  useDeleteDatasetMutation,
  useGetRubricsByDatasetQuery,
  useGetRubricByIdQuery,
  useCreateRubricMutation,
  useUpdateRubricMutation,
  useDeleteRubricMutation,
  useFetchAnnotationsByDatasetQuery,
  useSaveAnnotationMutation,
  useCreateAnnotationSessionMutation,
  useDeleteAnnotationMutation,
  useFetchAnnotationStatsQuery,
} = datasetApi;