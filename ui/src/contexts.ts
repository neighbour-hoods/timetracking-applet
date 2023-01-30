import { createContext } from '@lit-labs/context';
import { ApolloClient, NormalizedCacheObject } from './provider-graphql-client';
import { SensemakerStore } from '@neighbourhoods/nh-we-applet';

export const hreaGraphQLContext = createContext<ApolloClient<NormalizedCacheObject>>(
    'hrea-graphql-context'
);
export const sensemakerStoreContext = createContext<SensemakerStore>(
    'sensemaker-store-context'
);
