import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { contextProvider } from '@lit-labs/context';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { hreaGraphQLContext, sensemakerStoreContext } from './contexts';
import { ApolloClient, NormalizedCacheObject } from './provider-graphql-client.js';
import { SensemakerStore } from '@neighbourhoods/nh-we-applet';
import { ComputeContextInput } from '@neighbourhoods/sensemaker-lite-types';
import { TimesheetEntriesList } from './index'
import { WorkInputManual } from './index'
import { get } from 'svelte/store';

export class ProviderApp extends ScopedElementsMixin(LitElement) {
  // set up the context providers for both stores so that they can be accessed by other components
  @contextProvider({ context: hreaGraphQLContext })
  @property()
  graphqlClient!: ApolloClient<NormalizedCacheObject>;

  @contextProvider({ context: sensemakerStoreContext })
  @property()
  sensemakerStore!: SensemakerStore;

  async firstUpdated() {
  }

  render() {
    return html`
      <main>
        <div class="home-page">
          <work-input-manual></work-input-manual>
          <timesheet-entries-list></timesheet-entries-list>
        </div>
      </main>
    `;
  }

  // this is an example function of computing a context, since your UI will likely be displaying various contexts
  // this is an example from the todo applet
  async computeContext(_e: CustomEvent) {
    /*
    const contextResultInput: ComputeContextInput = {
      resource_ehs: await this.providerStore.allProviderResourceEntryHashes(),
      context_eh: get(this.sensemakerStore.appletConfig()).cultural_contexts["most_important_tasks"],
      can_publish_result: false,
    }
    const contextResult = await this.sensemakerStore.computeContext("most_important_tasks", contextResultInput)
    */
  }

  static get scopedElements() {
    return {
      'timesheet-entries-list': TimesheetEntriesList,
      'work-input-manual': WorkInputManual,
    };
  }

  static styles = css`
    .home-page {
      display: flex;
      flex-direction: row;
    }

    :host {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      font-size: calc(10px + 2vmin);
      color: #1a2b42;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      background-color: var(--lit-element-background-color);
    }

    main {
      flex-grow: 1;
    }

    .app-footer {
      font-size: calc(12px + 0.5vmin);
      align-items: center;
    }

    .app-footer a {
      margin-left: 5px;
    }
  `;
}
