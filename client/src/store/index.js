import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { datasetApi } from "./apis/datasetApi";
import { authApi } from "./apis/authApi";

export const store = configureStore({
  reducer: {
    [datasetApi.reducerPath]: datasetApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware()
      .concat(datasetApi.middleware)
      .concat(authApi.middleware);
  }
});

setupListeners(store.dispatch);

export * from './apis/datasetApi';
export * from './apis/authApi';