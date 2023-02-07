import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { contextProvider } from '@lit-labs/context';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { get } from 'svelte/store';

import { SensemakerStore } from '@neighbourhoods/nh-we-applet';
import { ComputeContextInput } from '@neighbourhoods/sensemaker-lite-types';

import { hreaGraphQLContext, sensemakerStoreContext } from './contexts';
import { ApolloClient, NormalizedCacheObject } from './provider-graphql-client.js';

import { AgentProfileCheck } from '@neighbourhoods/component-vf-graphql-agent-profile-check'
import { AgentProfileManage } from '@neighbourhoods/component-vf-graphql-agent-profile-manage'
import { TimesheetEntriesList } from '@neighbourhoods/component-vf-graphql-time-entries-list'
import { WorkInputManual } from '@neighbourhoods/component-vf-graphql-work-input-daily'
import cssThemeVars from '@neighbourhoods/applet-vf-timetracker-theme-vars'

export class ProviderApp extends ScopedElementsMixin(LitElement) {
  // set up the context providers for both stores so that they can be accessed by other components
  @contextProvider({ context: hreaGraphQLContext })
  @property()
  graphqlClient!: ApolloClient<NormalizedCacheObject>;

  @contextProvider({ context: sensemakerStoreContext })
  @property()
  sensemakerStore!: SensemakerStore;

  render() {
    return html`
      <main>
        <div class="home-page">
          <agent-profile-check>

            <agent-profile-manage slot="profile-missing" @agentProfileCreated=${this.onProfileCreated}></agent-profile-manage>

            <work-input-manual slot="profile-ok"></work-input-manual>
            <timesheet-entries-list slot="profile-ok"></timesheet-entries-list>

          </agent-profile-check>
        </div>
      </main>
    `;
  }

  /**
   * Requery agent profiles in AgentProfileCheck component when
   * profile is created in AgentProfileManage.
   *
   * @see https://github.com/apollo-elements/apollo-elements/issues/39#issuecomment-476272681
   */
  async onProfileCreated(_e: CustomEvent) {
    if (!this.shadowRoot) {
      return
    }

    const profileCheck: AgentProfileCheck | null = this.shadowRoot.querySelector('agent-profile-check')
    if (profileCheck) {
      profileCheck.me.subscribe({ nextFetchPolicy: 'cache-only' })
    }
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
      'agent-profile-check': AgentProfileCheck,
      'agent-profile-manage': AgentProfileManage,
      'timesheet-entries-list': TimesheetEntriesList,
      'work-input-manual': WorkInputManual,
    };
  }

  static styles = css`
    ${cssThemeVars}

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
