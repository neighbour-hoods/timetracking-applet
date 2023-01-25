import { createContext } from '@lit-labs/context';
import { GraphQLClientProvider } from './provider-graphql-client';
import { SensemakerStore } from '@neighbourhoods/nh-we-applet';

export const hreaGraphQLContext = createContext<GraphQLClientProvider>(
    'hrea-graphql-context'
);
export const sensemakerStoreContext = createContext<SensemakerStore>(
    'sensemaker-store-context'
);
