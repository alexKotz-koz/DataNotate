import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: 'admin' | 'researcher' | 'annotator';
}

interface AuthResponse {
  success: boolean;
  user: AuthUser | null;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    currentUser: builder.query<{ user: AuthUser | null }, void>({
      providesTags: ['Auth'],
      query: () => ({ url: '/auth/me', method: 'GET' })
    }),
    login: builder.mutation<AuthResponse, { username: string; password: string }>({
      invalidatesTags: ['Auth'],
      query: (body) => ({ url: '/auth/login', method: 'POST', body })
    }),
    signup: builder.mutation<AuthResponse, { username: string; password: string; email: string; firstName?: string; lastName?: string; organization?: string; role?: 'admin' | 'researcher' | 'annotator' }>({
      invalidatesTags: ['Auth'],
      query: (body) => ({ url: '/auth/signup', method: 'POST', body })
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      invalidatesTags: ['Auth'],
      query: () => ({ url: '/auth/logout', method: 'POST' })
    })
  })
});

export const {
  useCurrentUserQuery,
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation
} = authApi;
