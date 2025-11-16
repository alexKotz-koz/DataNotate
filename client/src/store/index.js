import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { datasetApi } from "./apis/datasetApi";

export const store = configureStore({
  reducer: {
    [datasetApi.reducerPath]: datasetApi.reducer,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware()
      .concat(datasetApi.middleware);
  }
});

setupListeners(store.dispatch);

export * from './apis/datasetApi';